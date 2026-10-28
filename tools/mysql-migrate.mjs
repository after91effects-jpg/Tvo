#!/usr/bin/env node
// Offline export: no credentials or customer data are written to the repository.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const [source, output, target] = process.argv.slice(2);
if (!source || !output || !/^[a-zA-Z0-9_]+$/.test(target || '')) {
  throw new Error('Usage: node tools/mysql-migrate.mjs SOURCE.db PRIVATE_OUTPUT.sql TARGET_DATABASE');
}
if (fs.existsSync(output)) throw new Error('Output already exists; refusing to overwrite');
const db = new Database(path.resolve(source), { readonly: true });
if (db.pragma('integrity_check').some(r => r.integrity_check !== 'ok')) throw new Error('Source integrity check failed');
if (db.pragma('foreign_key_check').length) throw new Error('Source has broken foreign keys');
const q = s => '`' + s.replaceAll('`', '``') + '`';
const literal = v => v === null ? 'NULL' : typeof v === 'number'
  ? (Number.isFinite(v) ? String(v) : (() => { throw new Error('Non-finite number'); })())
  : Buffer.isBuffer(v) ? `X'${v.toString('hex')}'` : `CONVERT(X'${Buffer.from(String(v)).toString('hex')}' USING utf8mb4)`;
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
const statements = [
  '-- Private TVO SQLite → MySQL migration. Import ONCE into the named EMPTY database.',
  '-- Do not import into an existing application database. No existing table is dropped or replaced.',
  `USE ${q(target)};`, "SET NAMES utf8mb4 COLLATE utf8mb4_bin;", "SET time_zone = '+00:00';",
  'CREATE TABLE tvo_storage_metadata (id INT PRIMARY KEY, version INT NOT NULL, source_sha256 VARCHAR(64) NOT NULL, verified_at VARCHAR(30) NOT NULL) ENGINE=InnoDB;',
];
const schemas = new Map();
const counts = {};
for (const table of tables) {
  const columns = db.pragma(`table_info(${JSON.stringify(table.name)})`);
  const indices = db.pragma(`index_list(${JSON.stringify(table.name)})`).map(i => ({...i, columns: db.pragma(`index_info(${JSON.stringify(i.name)})`)}));
  const indexed = new Set(indices.flatMap(i => i.columns.map(c => c.name)));
  const primary = columns.filter(c => c.pk).sort((a,b) => a.pk-b.pk);
  primary.forEach(c => indexed.add(c.name));
  const defs = columns.map(c => {
    let type = /INT/i.test(c.type) ? 'BIGINT' : /REAL|FLOAT|DOUBLE|NUMERIC|DECIMAL/i.test(c.type) ? 'DOUBLE' : /BLOB/i.test(c.type) ? 'LONGBLOB' : indexed.has(c.name) ? 'VARCHAR(255)' : 'LONGTEXT';
    if (type === 'VARCHAR(255)') {
      const max = db.prepare(`SELECT MAX(length(${q(c.name)})) AS n FROM ${q(table.name)}`).get().n || 0;
      if (max > 255) throw new Error(`Indexed value exceeds VARCHAR(255): ${table.name}.${c.name}`);
    }
    const auto = primary.length === 1 && c.pk && /INT/i.test(c.type);
    let def = `${q(c.name)} ${type}${c.notnull || c.pk ? ' NOT NULL' : ''}${auto ? ' AUTO_INCREMENT' : ''}`;
    if (c.dflt_value !== null && !auto) {
      let value = c.dflt_value;
      if (/datetime\('now'\)/i.test(value)) value = '(UTC_TIMESTAMP())';
      else if (/^\(?-?\d+(\.\d+)?\)?$/.test(value) || /^NULL$/i.test(value) || /^'.*'$/s.test(value)) { /* source schema literal */ }
      else throw new Error(`Unsupported default: ${table.name}.${c.name}`);
      if ((type === 'LONGTEXT' || type === 'LONGBLOB') && !value.startsWith('(')) value = '(' + value + ')';
      def += ` DEFAULT ${value}`;
    }
    return def;
  });
  if (primary.length) defs.push(`PRIMARY KEY (${primary.map(c=>q(c.name)).join(',')})`);
  let ix=0;
  for (const index of indices.filter(i=>i.origin !== 'pk')) {
    if ((index.partial && index.unique) || index.columns.some(c=>!c.name)) throw new Error(`Unsupported index: ${index.name}`);
    defs.push(`${index.unique ? 'UNIQUE ' : ''}KEY ${q('tvo_ix_'+(++ix))} (${index.columns.map(c=>q(c.name)).join(',')})`);
  }
  statements.push(`CREATE TABLE ${q(table.name)} (\n${defs.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;`);
  schemas.set(table.name, { columns, primary });
}
statements.push('START TRANSACTION;');
const checks = [];
for (const table of tables) {
  const {columns, primary} = schemas.get(table.name);
  const rows = db.prepare(`SELECT * FROM ${q(table.name)}`).all();
  counts[table.name] = rows.length;
  const cols = columns.map(c=>q(c.name)).join(',');
  for (let i=0;i<rows.length;i+=25) {
    const chunk=rows.slice(i,i+25);
    statements.push(`INSERT INTO ${q(table.name)} (${cols}) VALUES\n${chunk.map(r=>'('+columns.map(c=>literal(r[c.name])).join(',')+')').join(',\n')};`);
  }
  checks.push(`SELECT COUNT(*) = ${rows.length} INTO @tvo_count_${checks.length} FROM ${q(table.name)};`);
  for(let i=0;i<rows.length;i+=20) {
    const chunk=rows.slice(i,i+20);
    const match = chunk.map(r=>'('+columns.map(c=>`(${q(c.name)} <=> ${literal(r[c.name])})`).join(' AND ')+')').join(' OR ');
    // Every row, every column is compared after MySQL has stored it. NULLs,
    // Unicode, blobs and numeric values are included; no count-only approval.
    checks.push(`SELECT COUNT(*) = ${chunk.length} INTO @tvo_count_${checks.length} FROM ${q(table.name)} WHERE ${match};`);
  }
}
statements.push('COMMIT;');
for(const table of tables) {
  const keys = db.pragma(`foreign_key_list(${JSON.stringify(table.name)})`);
  const grouped=Map.groupBy(keys,k=>k.id);
  for(const [id, parts] of grouped) {
    parts.sort((a,b)=>a.seq-b.seq);
    const f=parts[0];
    statements.push(`ALTER TABLE ${q(table.name)} ADD CONSTRAINT ${q('tvo_fk_'+table.name+'_'+id)} FOREIGN KEY (${parts.map(p=>q(p.from)).join(',')}) REFERENCES ${q(f.table)} (${parts.map(p=>q(p.to)).join(',')}) ON DELETE ${f.on_delete} ON UPDATE ${f.on_update};`);
  }
  const seq=db.prepare('SELECT seq FROM sqlite_sequence WHERE name=?').get(table.name);
  if(seq) statements.push(`ALTER TABLE ${q(table.name)} AUTO_INCREMENT=${Number(seq.seq)+1};`);
}
// Recheck all 35 foreign keys independently; the final marker remains absent if
// any verification statement fails or yields NULL/false.
for(const table of tables) for(const f of db.pragma(`foreign_key_list(${JSON.stringify(table.name)})`)) {
  checks.push(`SELECT COUNT(*) = 0 INTO @tvo_count_${checks.length} FROM ${q(table.name)} a LEFT JOIN ${q(f.table)} b ON a.${q(f.from)}=b.${q(f.to)} WHERE a.${q(f.from)} IS NOT NULL AND b.${q(f.to)} IS NULL;`);
}
checks.push(`SELECT COUNT(*) = 35 INTO @tvo_count_${checks.length} FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE();`);
const hash=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
statements.push(...checks);
statements.push(`INSERT INTO tvo_storage_metadata (id,version,source_sha256,verified_at) SELECT 1,1,'${hash}',UTC_TIMESTAMP() WHERE ${checks.map((_,i)=>`@tvo_count_${i}=1`).join(' AND ')};`);
statements.push('SELECT id,version,source_sha256,verified_at FROM tvo_storage_metadata;');
fs.writeFileSync(output,statements.join('\n\n'),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({tables:tables.length,rows:Object.values(counts).reduce((a,b)=>a+b,0),checks:checks.length,bytes:fs.statSync(output).size,sha256:hash,counts}));
db.close();
