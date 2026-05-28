require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawnSync } = require('child_process');
const path = require('path');
const { waitForDatabase } = require('./wait-for-db');

const serverRoot = path.join(__dirname, '..');

async function main() {
  console.log('🐳 Galerio API — Docker başlatılıyor...');
  await waitForDatabase();

  console.log('👤 Admin hesabı kontrol ediliyor...');
  const seed = spawnSync('node', ['scripts/ensure-admin.js'], {
    cwd: serverRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (seed.status !== 0) {
    console.error('❌ ensure-admin başarısız.');
    process.exit(seed.status || 1);
  }

  console.log('🚀 API sunucusu başlatılıyor...');
  require(path.join(serverRoot, 'index.js'));
}

main().catch((err) => {
  console.error('❌ Docker başlatma hatası:', err.message);
  process.exit(1);
});
