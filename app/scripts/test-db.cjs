const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2/promise');

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  } catch (err) {
    console.error('Invalid DATABASE_URL', err.message);
    process.exit(1);
  }
}

(async () => {
  try {
    const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
    console.log('Testing MySQL connection to', cfg.host + ':' + cfg.port, 'db=', cfg.database);
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
    });
    const [rows] = await conn.execute('SELECT 1 as ok');
    console.log('Connection test succeeded:', rows[0]);
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Connection test failed:', err.message);
    process.exit(1);
  }
})();
