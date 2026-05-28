require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const cliEmail = process.argv[2];
const ADMIN_EMAIL = cliEmail || process.env.ADMIN_EMAIL || 'admin@galerio.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Galeri Admin';

const { getDbSslConfig } = require('../lib/dbSsl');

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: '+03:00',
    ssl: getDbSslConfig(),
  });

  const [admins] = await db.query(
    "SELECT id, name, email FROM users WHERE role = 'admin'"
  );

  console.log('\n--- Mevcut admin hesapları ---');
  if (admins.length === 0) {
    console.log('  (yok)');
  } else {
    admins.forEach((a) => console.log(`  • ${a.email}  (${a.name})`));
  }

  const [existing] = await db.query('SELECT id, role FROM users WHERE email = ?', [
    ADMIN_EMAIL,
  ]);
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existing.length > 0) {
    await db.query(
      "UPDATE users SET name = ?, password = ?, role = 'admin' WHERE email = ?",
      [ADMIN_NAME, hash, ADMIN_EMAIL]
    );
    console.log(`\n✅ Güncellendi: ${ADMIN_EMAIL} (rol: admin, şifre sıfırlandı)`);
  } else {
    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
      [ADMIN_NAME, ADMIN_EMAIL, hash]
    );
    console.log(`\n✅ Yeni admin oluşturuldu: ${ADMIN_EMAIL}`);
  }

  console.log('\n📱 Mobilde admin girişi:');
  console.log(`   E-posta: ${ADMIN_EMAIL}`);
  console.log(`   Şifre:   ${ADMIN_PASSWORD}`);
  console.log('\n⚠️  Kayıt formu sadece "user" rolü açar; admin bu script ile yönetilir.\n');

  await db.end();
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
