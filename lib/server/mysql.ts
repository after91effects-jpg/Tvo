import path from 'node:path';
import { Worker } from 'node:worker_threads';
import type Database from 'better-sqlite3';

/**
 * Preserve the existing synchronous repository contract on one dedicated MySQL
 * connection per process. Transaction callbacks cannot yield, so unrelated
 * requests cannot enter another request's transaction on this connection.
 */
export function createMysqlDatabase(): Database.Database {
  for (const key of ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD']) {
    if (!process.env[key]) throw new Error(`Missing required database configuration: ${key}`);
  }
  const worker = new Worker(path.join(process.cwd(), 'lib/server/mysql-worker.cjs'), {
    workerData: { config: {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      ...(process.env.MYSQL_SOCKET ? { socketPath: process.env.MYSQL_SOCKET } : {}),
      ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
    } },
  });
  worker.unref();
  let broken = false;
  worker.on('error', () => { broken = true; });
  let depth = 0;
  const signal = new SharedArrayBuffer(8);
  const output = new SharedArrayBuffer(32 * 1024 * 1024);
  const control = new Int32Array(signal);
  function call(action: string, sql = '', params: unknown[] = []) {
    if (broken) throw new Error('Database connection unavailable; restart required');
    Atomics.store(control, 0, 0);
    Atomics.store(control, 1, 0);
    worker.postMessage({ action, sql, params, signal, output });
    if (Atomics.wait(control, 0, 0, 25000) === 'timed-out') {
      // A timed-out write has an unknown outcome. Never retry it automatically.
      broken = true;
      void worker.terminate();
      throw new Error('Database operation timed out; its outcome must be checked before retrying');
    }
    const response = JSON.parse(Buffer.from(output, 0, Atomics.load(control, 1)).toString());
    if (response.error) {
      const error = Object.assign(new Error(response.error.message), response.error);
      throw error;
    }
    return response.result;
  }
  function prepare(sql: string) {
    const pragma = /^\s*PRAGMA\s+table_info\s*\(\s*([\w]+)\s*\)/i.exec(sql);
    if (pragma) {
      const query = 'SELECT COLUMN_NAME AS name, DATA_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS dflt_value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION';
      return { all: () => call('all', query, [pragma[1]]) };
    }
    sql = sql.replace(/\bsqlite_master\b/gi, '(SELECT TABLE_NAME AS name, \'table\' AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()) AS sqlite_master');
    if (/\bsqlite_sequence\b/i.test(sql)) {
      sql = "SELECT COALESCE(AUTO_INCREMENT, 1)-1 AS seq FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'";
    }
    const bindings = (args: unknown[]) => args.length === 1 && Array.isArray(args[0]) ? args[0] as unknown[] : args;
    return {
      all: (...args: unknown[]) => call('all', sql, bindings(args)),
      get: (...args: unknown[]) => call('get', sql, bindings(args)) ?? undefined,
      run: (...args: unknown[]) => call('run', sql, bindings(args)),
    };
  }
  function transaction(fn: (...args: unknown[]) => unknown) {
    const invoke = (...args: unknown[]) => {
      const level = depth;
      call('run', level ? `SAVEPOINT tvo_${level}` : 'START TRANSACTION');
      if (!level) {
        try {
          // Match SQLite's single-writer transactions across app processes.
          // Stock checks and order-number generation happen after this lock.
          call('get', 'SELECT id FROM tvo_storage_metadata WHERE id=1 FOR UPDATE');
        } catch (error) {
          try { call('run', 'ROLLBACK'); } catch { /* preserve lock failure */ }
          throw error;
        }
      }
      depth++;
      try {
        const result = fn(...args);
        if (result instanceof Promise) throw new Error('Database transaction callbacks must be synchronous');
        call('run', level ? `RELEASE SAVEPOINT tvo_${level}` : 'COMMIT');
        return result;
      } catch (error) {
        try { call('run', level ? `ROLLBACK TO SAVEPOINT tvo_${level}` : 'ROLLBACK'); } catch { /* preserve original failure */ }
        throw error;
      } finally { depth--; }
    };
    return Object.assign(invoke, { immediate: invoke, deferred: invoke, exclusive: invoke });
  }
  return {
    prepare, transaction,
    exec: (sql: string) => call('run', sql),
    close: () => { call('close'); void worker.terminate(); },
    backup: async () => { throw new Error('MySQL backups are managed in Hostinger hPanel. Local SQLite snapshots do not back up MySQL.'); },
  } as unknown as Database.Database;
}
