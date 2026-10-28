'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const mysql = require('mysql2/promise');
const { mysqlSql } = require('./mysql-dialect.cjs');

let connection;
let connectionFailure;
let inTransaction = false;
async function getConnection() {
  if (connectionFailure) throw connectionFailure;
  if (!connection) {
    const candidate = await mysql.createConnection({
      ...workerData.config,
      charset: 'utf8mb4', timezone: 'Z', dateStrings: true,
      decimalNumbers: true, supportBigNumbers: true,
      multipleStatements: false, connectTimeout: 10000,
    });
    try {
      await candidate.query("SET time_zone = '+00:00'");
      await candidate.query("SET SESSION sql_mode = REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', '')");
      await candidate.query('SET SESSION innodb_lock_wait_timeout = 15');
      const [marker] = await candidate.query('SELECT version FROM tvo_storage_metadata WHERE id=1');
      if (marker[0]?.version !== 1) throw new Error('MySQL migration has not been verified');
    } catch (error) {
      await candidate.end();
      throw error;
    }
    candidate.on('error', error => { connectionFailure = error; });
    connection = candidate;
  }
  return connection;
}

parentPort.on('message', async ({ action, sql, params, signal, output }) => {
  const control = new Int32Array(signal);
  let response;
  try {
    const db = await getConnection();
    if (action === 'close') { await db.end(); connection = undefined; response = { result: true }; }
    else {
      const translated = mysqlSql(sql);
      const ownTransaction = !inTransaction && /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(translated);
      let rows;
      try {
        if (ownTransaction) {
          await db.beginTransaction();
          await db.query('SELECT id FROM tvo_storage_metadata WHERE id=1 FOR UPDATE');
        }
        [rows] = await db.query({ sql: translated, timeout: 20000 }, params || []);
        if (/^\s*START\s+TRANSACTION\b/i.test(translated)) inTransaction = true;
        if (/^\s*(COMMIT|ROLLBACK)\s*$/i.test(translated)) inTransaction = false;
        if (ownTransaction) await db.commit();
      } catch (error) {
        if (ownTransaction) await db.rollback();
        throw error;
      }
      response = { result: action === 'run'
        ? { changes: /ON\s+CONFLICT|INSERT\s+OR\s+REPLACE/i.test(sql) && rows.affectedRows === 2 ? 1 : rows.affectedRows, lastInsertRowid: rows.insertId || 0 }
        : action === 'get' ? (rows[0] ?? null) : rows };
    }
  } catch (error) {
    if (error.errno === 1062) {
      error.message = `UNIQUE constraint failed: ${error.message}`;
      error.code = 'SQLITE_CONSTRAINT_UNIQUE';
    }
    response = { error: { message: error.message, code: error.code, errno: error.errno } };
  }
  let bytes = Buffer.from(JSON.stringify(response));
  if (bytes.length > output.byteLength) bytes = Buffer.from(JSON.stringify({ error: { message: 'Database response exceeds 32 MB; use pagination', code: 'DB_RESULT_TOO_LARGE' } }));
  new Uint8Array(output).set(bytes);
  Atomics.store(control, 1, bytes.length);
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0);
});
