# Admin kullanicisinin ID'sini gosterir ve gerekirse mesajlardaki admin referansini gunceller
# Kullanim: .\scripts\fix-admin-id.ps1

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
$dbPwd = Read-Host "DB_PASSWORD" -AsSecureString
$B2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPwd)
$env:DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($B2)

$tmpScript = Join-Path $env:TEMP "fix-admin-$([guid]::NewGuid().ToString('N')).js"

@'
require("dotenv").config();
const mysql = require("mysql2/promise");
const { getDbSslConfig } = require("./lib/dbSsl");

async function main() {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: getDbSslConfig(),
  });

  const [admins] = await db.query("SELECT id, email, name FROM users WHERE role = 'admin'");
  if (admins.length === 0) {
    console.log("Admin bulunamadi.");
    await db.end();
    return;
  }

  const admin = admins[0];
  console.log("\nMevcut admin: " + admin.email + " (id: " + admin.id + ")");

  if (admin.id === 1) {
    console.log("Admin ID zaten 1. Duzeltme gerekmiyor.");
    await db.end();
    return;
  }

  const oldId = admin.id;
  const newId = 1;

  // Onceki id=1 kullanici varsa sil
  await db.query("DELETE FROM hidden_conversations WHERE user_id = ?", [newId]);
  await db.query("DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?", [newId, newId]);
  await db.query("DELETE FROM users WHERE id = ? AND role != 'admin'", [newId]);

  // Admin ID'sini 1 yap
  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  await db.query("UPDATE messages SET sender_id = ? WHERE sender_id = ?", [newId, oldId]);
  await db.query("UPDATE messages SET receiver_id = ? WHERE receiver_id = ?", [newId, oldId]);
  await db.query("UPDATE hidden_conversations SET user_id = ? WHERE user_id = ?", [newId, oldId]);
  await db.query("UPDATE vehicles SET user_id = ? WHERE user_id = ?", [newId, oldId]);
  await db.query("UPDATE users SET id = ? WHERE id = ?", [newId, oldId]);
  await db.query("SET FOREIGN_KEY_CHECKS = 1");

  // conversation_id icindeki admin_X referansini guncelle
  const [msgs] = await db.query("SELECT id, conversation_id FROM messages WHERE conversation_id LIKE ?", ["%admin_" + oldId]);
  for (const msg of msgs) {
    const newConvId = msg.conversation_id.replace("admin_" + oldId, "admin_" + newId);
    await db.query("UPDATE messages SET conversation_id = ? WHERE id = ?", [newConvId, msg.id]);
  }
  const [hc] = await db.query("SELECT user_id, conversation_id FROM hidden_conversations WHERE conversation_id LIKE ?", ["%admin_" + oldId]);
  for (const row of hc) {
    const newConvId = row.conversation_id.replace("admin_" + oldId, "admin_" + newId);
    await db.query("UPDATE hidden_conversations SET conversation_id = ? WHERE user_id = ? AND conversation_id = ?", [newConvId, row.user_id, row.conversation_id]);
  }

  console.log("Tamam: admin ID " + oldId + " -> " + newId + " guncellendi.");
  await db.end();
}

main().catch(err => { console.error("Hata:", err.message); process.exit(1); });
'@ | Set-Content -Path $tmpScript -Encoding UTF8

Write-Host ""
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
