import mysql from 'mysql2/promise';

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("DATABASE_URL is not set in environment");
      process.exit(1);
    }
    const u = new URL(url);
    const conn = await mysql.createConnection({
      host: u.hostname,
      port: u.port || 3306,
      user: u.username,
      password: decodeURIComponent(u.password),
      database: u.pathname.slice(1)
    });
    const [rows] = await conn.execute('SELECT 1+1 as v');
    console.log("Database connection successful. Result:", rows);
    await conn.end();
  } catch (e) {
    console.error("Database connection failed:", e);
    process.exit(1);
  }
})();
