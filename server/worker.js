/**
 * RabbitMQ mesaj worker — Faz 3
 * Kuyruktan okur → MySQL → Redis pub/sub ile API'ye socket olayı gönderir.
 */
require('dotenv').config();
const path = require('path');
const { waitForDatabase } = require('./scripts/wait-for-db');
const { pool } = require('./lib/db');
const { connectRedis } = require('./lib/redis');
const { connectRabbitMQ, consumeMessages } = require('./lib/rabbitmq');
const { processIncomingMessage } = require('./lib/messageProcessor');
const { initSocketBridge, publishSocketDispatch } = require('./lib/socketBridge');

async function main() {
  console.log('🐇 Galerio Message Worker başlatılıyor...');
  await waitForDatabase();
  await connectRedis();
  await initSocketBridge();

  const rabbitOk = await connectRabbitMQ();
  if (!rabbitOk) {
    console.error('❌ RABBITMQ_URL gerekli. Worker durduruluyor.');
    process.exit(1);
  }

  await consumeMessages(async (payload) => {
    console.log('📥 Kuyruktan mesaj alındı:', payload.conversation_id);
    const result = await processIncomingMessage(pool, payload);
    const published = await publishSocketDispatch(result);
    if (!published) {
      console.error('❌ Socket köprüsüne yayınlanamadı (REDIS_URL?)');
    }
  });
}

main().catch((err) => {
  console.error('Worker hatası:', err);
  process.exit(1);
});
