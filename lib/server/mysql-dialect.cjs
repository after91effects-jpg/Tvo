'use strict';

// Application-authored SQL only. mysql2 binds values separately.
function mysqlSql(input) {
  const literals = [];
  let sql = input.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|`[^`]*`|--[^\n]*|\/\*[\s\S]*?\*\//g, value => {
    const token = `\x01${literals.length}\x02`;
    literals.push(value);
    return token;
  });
  sql = sql.replace(/\b(datetime|date)\(\s*\x01(\d+)\x02\s*(?:,\s*\x01(\d+)\x02\s*)?\)/gi,
    (original, kind, first, second) => {
      if (literals[Number(first)] !== "'now'") return original;
      const now = kind.toLowerCase() === 'date' ? 'UTC_DATE()' : 'UTC_TIMESTAMP()';
      if (second === undefined) return now;
      const modifier = /^'(-?\d+)\s+(day|hour|minute|second)s?'$/i.exec(literals[Number(second)]);
      if (!modifier) throw new Error('Unsupported SQLite date modifier');
      return `DATE_ADD(${now}, INTERVAL ${Number(modifier[1])} ${modifier[2].toUpperCase()})`;
    });
  sql = sql.replace(/\bINSERT\s+OR\s+IGNORE\b/gi, 'INSERT IGNORE')
    .replace(/\bINSERT\s+OR\s+REPLACE\b/gi, 'REPLACE')
    .replace(/\bON\s+CONFLICT\s*\([^)]*\)\s+DO\s+UPDATE\s+SET\b/gi, 'ON DUPLICATE KEY UPDATE')
    .replace(/\bexcluded\.([a-z_][a-z_0-9]*)/gi, 'VALUES(`$1`)');
  sql = sql.replace(/\bkey\b/gi, (value, offset) => /(?:DUPLICATE|PRIMARY|FOREIGN|UNIQUE)\s+$/i.test(sql.slice(0, offset)) ? value : '`key`');
  // Keep storefront/admin searches case-insensitive while retaining binary
  // uniqueness for migrated identifiers such as slugs and setting keys.
  sql = sql.replace(/\bLIKE\s+(\?|\x01\d+\x02)/gi, 'LIKE $1 COLLATE utf8mb4_general_ci');
  return sql.replace(/\x01(\d+)\x02/g, (_, i) => literals[Number(i)]);
}
module.exports = { mysqlSql };
