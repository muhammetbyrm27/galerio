require('dotenv').config();
const mysql = require('mysql2');
const { getDbSslConfig } = require('./dbSsl');

const useDbSsl = process.env.DB_SSL === 'true';
const ssl = getDbSslConfig();

const pool = mysql
  .createPool({
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 15000,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: '+00:00',
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl,
  })
  .promise();

pool.on('error', (err) => {
  console.error('MySQL pool hatası:', err.code, err.fatal ? '(FATAL)' : '');
});

module.exports = { pool, useDbSsl };
