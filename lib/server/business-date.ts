/** Calendar dates for the bakery's configured India time zone; DB timestamps remain UTC. */
export function businessDateSql(value = 'created_at', days = 0) {
  if (!/^[a-z_][a-z0-9_.]*$/i.test(value) || !Number.isInteger(days)) throw new Error('Invalid business date expression');
  if (process.env.DATABASE_DRIVER === 'mysql') {
    const timestamp = value === 'now' ? 'UTC_TIMESTAMP()' : `CAST(REPLACE(REPLACE(${value},'T',' '),'Z','') AS DATETIME)`;
    return `DATE(DATE_ADD(${timestamp}, INTERVAL ${330 + days * 1440} MINUTE))`;
  }
  return `date(${value === 'now' ? "'now'" : value}, '+330 minutes'${days ? `, '${days} days'` : ''})`;
}
