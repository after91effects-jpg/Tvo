# Permanent MySQL storage

The default local driver remains SQLite. Production selects MySQL with server-only environment variables:

```
DATABASE_DRIVER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=<Hostinger database name>
MYSQL_USER=<Hostinger database user>
MYSQL_PASSWORD=<set privately in hPanel>
```

Never use a NEXT_PUBLIC_ prefix for credentials. Never commit exports, database passwords or customer snapshots. MYSQL_SOCKET exists only for private local integration tests. MYSQL_SSL=true enables certificate verification when connecting to a TLS database provider.

## Migration and verification

`node tools/mysql-migrate.mjs SOURCE.db PRIVATE_OUTPUT.sql TARGET_DATABASE` exports a strictly checked SQLite snapshot for a new, empty MySQL/MariaDB database. It refuses an existing output file, broken integrity, broken foreign keys, unsupported indexes/defaults and indexed values exceeding 255 characters. Import the generated SQL once into the named empty database. It creates tables without dropping/replacing existing tables, preserves IDs, unique indexes, foreign keys, defaults and sequence high-water marks. Partial import must be disabled in phpMyAdmin.

After loading data, the SQL compares every field of every row, table counts, foreign-key data and the 35 foreign-key constraints. Only successful checks insert `tvo_storage_metadata.id=1, version=1`. The app refuses its first database operation without that marker. Preserve the private source snapshot and SQL export for recovery. An incomplete target remains inactive; do not rerun blindly over a partial import.

Freeze HTTP requests before the final source copy. For WAL-mode SQLite, download the database and matching WAL together while writes are stopped, rebuild a consistent private snapshot and compare all source rows/values before export. Switch the environment and deploy only after the target verification marker is present. Keep maintenance routing until public/admin checks pass, then restore the original routing file.

## Runtime behavior

The existing synchronous repositories use a dedicated mysql2 worker and one connection per process. Bound values stay separate from SQL conversion. UTC date expressions, conflict updates, case-insensitive searches and schema lookups retain the application's behavior. SQLite boot migrations and automatic seeding never run on MySQL.

Outer write transactions lock the verified storage metadata row before stock checks/order numbering. Single autocommit writes take the same lock, so multiple app processes retain SQLite's serialized writer behavior. Nested transactions use savepoints. A timeout is never automatically retried because a write may already have committed. The synchronous contract blocks a Node event loop during each query; consider an async repository refactor if traffic requires higher concurrency.

MySQL backups and restores belong in Hostinger hPanel. Admin health identifies the active driver, and the old SQLite snapshot button is hidden for MySQL. Local snapshots never represent a backup of MySQL. SQLite integrity checks now accept only the exact result `ok`; unchecked snapshots are labelled unverified.

## Validation

The migration was rehearsed on a separate socket-only MySQL 8.4 instance, with every imported row/value verified. Tests cover upserts, Unicode, NULLs, generated IDs, date/search compatibility, rollback, nested savepoints, foreign keys, real catalog/order/delivery repositories and 49 admin sections. Production standalone packaging is tested with MySQL so the worker and its dependencies are present. The final live deployment must additionally verify Hostinger credentials, driver=MySQL, business counts and persistence of the pre-deployment verification marker.
