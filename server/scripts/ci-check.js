/**
 * CI syntax kontrolü — modülleri yüklemeden parse doğrulaması.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');

const files = [
  'index.js',
  'worker.js',
  'scripts/docker-start.js',
  'scripts/wait-for-db.js',
  'scripts/ensure-admin.js',
  'lib/db.js',
  'lib/inbox.js',
  'lib/redis.js',
  'lib/rabbitmq.js',
  'lib/messageProcessor.js',
  'lib/socketEmit.js',
  'lib/socketBridge.js',
];

let failed = 0;

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error(`❌ Dosya yok: ${rel}`);
    failed += 1;
    continue;
  }
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`❌ ${rel}`);
    if (result.stderr) console.error(result.stderr);
    failed += 1;
  } else {
    console.log(`✅ ${rel}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n✅ ${files.length} dosya syntax kontrolünden geçti.`);
