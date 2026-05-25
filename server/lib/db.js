require('dotenv').config();
const mysql = require('mysql2');

const useDbSsl = process.env.DB_SSL === 'true';

const pool = mysql
  .createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: '+03:00',
    ssl: useDbSsl ? { rejectUnauthorized: true } : false,
  })
  .promise();

module.exports = { pool, useDbSsl };
