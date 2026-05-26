/**
 * MySQL hazır olana kadar bekler (Docker başlangıcı).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const MAX_ATTEMPTS = 30;
const DELAY_MS = 2000;

const { getDbSslConfig } = require('../lib/dbSsl');

async function ping() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    ssl: getDbSslConfig(),
  });
  await connection.query('SELECT 1');
  await connection.end();
}

async function waitForDatabase() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await ping();
      console.log('✅ MySQL bağlantısı hazır.');
      return;
    } catch (err) {
      console.log(
        `⏳ MySQL bekleniyor (${attempt}/${MAX_ATTEMPTS}): ${err.message}`
      );
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  throw new Error('MySQL bağlantısı zaman aşımına uğradı.');
}

if (require.main === module) {
  waitForDatabase().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { waitForDatabase };
