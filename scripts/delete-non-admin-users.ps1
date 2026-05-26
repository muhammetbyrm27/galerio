# Admin haric tum kullanicilari siler (messages, hidden_conversations da temizlenir)
# Kullanim: .\scripts\delete-non-admin-users.ps1

$serverDir = Join-Path $PSScriptRoot "..\server"

Write-Host ""
Write-Host "Aiven baglanti bilgileri" -ForegroundColor Cyan
$env:DB_HOST = Read-Host "DB_HOST"
$env:DB_PORT = Read-Host "DB_PORT [12569]"
if ([string]::IsNullOrWhiteSpace($env:DB_PORT)) { $env:DB_PORT = "12569" }
$env:DB_USER = Read-Host "DB_USER [avnadmin]"
if ([string]::IsNullOrWhiteSpace($env:DB_USER)) { $env:DB_USER = "avnadmin" }
$env:DB_NAME = Read-Host "DB_NAME [defaultdb]"
if ([string]::IsNullOrWhiteSpace($env:DB_NAME)) { $env:DB_NAME = "defaultdb" }
$env:DB_SSL = "true"
$dbPwd = Read-Host "DB_PASSWORD (Aiven)" -AsSecureString
$B2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPwd)
$env:DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($B2)

$tmpScript = Join-Path $env:TEMP "delete-users-$([guid]::NewGuid().ToString('N')).js"

@"
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDbSslConfig } = require('./lib/dbSsl');

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: getDbSslConfig(),
  });

  const [admins] = await db.query("SELECT id, email FROM users WHERE role = 'admin'");
  console.log('\nAdmin hesaplari (KORUNACAK):');
  admins.forEach(a => console.log('  * ' + a.email + ' (id:' + a.id + ')'));

  const [nonAdmins] = await db.query("SELECT id, email FROM users WHERE role != 'admin'");
  console.log('\nSilinecek kullanicilar (' + nonAdmins.length + '):');
  nonAdmins.forEach(u => console.log('  - ' + u.email + ' (id:' + u.id + ')'));

  if (nonAdmins.length === 0) {
    console.log('Silinecek kullanici yok.');
    await db.end();
    return;
  }

  const ids = nonAdmins.map(u => u.id);
  const placeholders = ids.map(() => '?').join(',');

  await db.query('DELETE FROM hidden_conversations WHERE user_id IN (' + placeholders + ')', ids);
  await db.query('DELETE FROM messages WHERE sender_id IN (' + placeholders + ') OR receiver_id IN (' + placeholders + ')', [...ids, ...ids]);
  const [result] = await db.query('DELETE FROM users WHERE role != \'admin\'');

  console.log('\nTamam: ' + result.affectedRows + ' kullanici silindi.');
  await db.end();
}

main().catch(err => { console.error('Hata:', err.message); process.exit(1); });
"@ | Set-Content -Path $tmpScript -Encoding UTF8

Write-Host ""
Write-Host "Isleniyor..." -ForegroundColor Cyan
Push-Location $serverDir
node $tmpScript
$code = $LASTEXITCODE
Pop-Location

Remove-Item $tmpScript -ErrorAction SilentlyContinue
Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue

if ($code -ne 0) {
  Write-Host "Hata olustu." -ForegroundColor Red
} else {
  Write-Host "Islem tamamlandi." -ForegroundColor Green
}
