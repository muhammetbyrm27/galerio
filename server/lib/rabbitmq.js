const amqp = require('amqplib');

const QUEUE_NAME = 'galerio.messages';

let connection = null;
let channel = null;
let rabbitReady = false;

function getRabbitUrl() {
  return process.env.RABBITMQ_URL || '';
}

function isRabbitConfigured() {
  return Boolean(getRabbitUrl());
}

async function connectRabbitMQ() {
  if (!isRabbitConfigured()) {
    console.log('ℹ️ RABBITMQ_URL tanımlı değil — mesajlar doğrudan işlenir.');
    return false;
  }
  if (rabbitReady && channel) return true;

  try {
    connection = await amqp.connect(getRabbitUrl());
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);
    rabbitReady = true;
    console.log(`✅ RabbitMQ kuyruğu hazır: ${QUEUE_NAME}`);

    connection.on('error', (err) => {
      console.warn('RabbitMQ bağlantı hatası:', err.message);
      rabbitReady = false;
    });
    connection.on('close', () => {
      rabbitReady = false;
      console.warn('RabbitMQ bağlantısı kapandı.');
    });

    return true;
  } catch (err) {
    rabbitReady = false;
    console.warn('⚠️ RabbitMQ kullanılamıyor:', err.message);
    return false;
  }
}

async function pingRabbitMQ() {
  return rabbitReady && channel != null;
}

async function publishMessage(payload) {
  if (!rabbitReady || !channel) return false;
  try {
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    });
    console.log('📬 Mesaj RabbitMQ kuyruğuna eklendi:', payload.conversation_id);
    return true;
  } catch (err) {
    console.warn('RabbitMQ publish hatası:', err.message);
    return false;
  }
}

async function consumeMessages(handler) {
  if (!rabbitReady || !channel) {
    throw new Error('RabbitMQ kanalı hazır değil');
  }

  await channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      console.error('❌ Kuyruk mesajı işlenemedi:', err);
      channel.nack(msg, false, false);
    }
  });

  console.log(`🐇 Worker kuyruğu dinliyor: ${QUEUE_NAME}`);
}

module.exports = {
  QUEUE_NAME,
  connectRabbitMQ,
  pingRabbitMQ,
  isRabbitConfigured,
  isRabbitReady: () => rabbitReady,
  publishMessage,
  consumeMessages,
};
