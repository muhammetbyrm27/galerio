const Redis = require('ioredis');

const SOCKET_CHANNEL = 'galerio:socket:events';

let publisher = null;
let subscriber = null;

function getRedisUrl() {
  return process.env.REDIS_URL || '';
}

async function initSocketBridge() {
  const url = getRedisUrl();
  if (!url) {
    console.log('ℹ️ Socket köprüsü için REDIS_URL gerekli (worker → API).');
    return false;
  }
  try {
    publisher = new Redis(url);
    subscriber = new Redis(url);
    await publisher.ping();
    await subscriber.ping();
    console.log('✅ Redis socket köprüsü hazır.');
    return true;
  } catch (err) {
    console.warn('⚠️ Socket köprüsü başlatılamadı:', err.message);
    publisher = null;
    subscriber = null;
    return false;
  }
}

async function publishSocketDispatch(dispatch) {
  if (!publisher) return false;
  try {
    await publisher.publish(SOCKET_CHANNEL, JSON.stringify(dispatch));
    return true;
  } catch (err) {
    console.warn('Socket köprüsü publish hatası:', err.message);
    return false;
  }
}

function subscribeSocketDispatch(io, onDispatch) {
  if (!subscriber) return;

  subscriber.on('message', (channel, raw) => {
    if (channel !== SOCKET_CHANNEL) return;
    try {
      const dispatch = JSON.parse(raw);
      onDispatch(io, dispatch);
    } catch (err) {
      console.error('Socket köprüsü mesaj parse hatası:', err);
    }
  });

  subscriber
    .subscribe(SOCKET_CHANNEL)
    .then(() => {
      console.log('📡 Socket köprüsü dinleniyor (worker → API).');
    })
    .catch((err) => {
      console.error('Socket köprüsü subscribe hatası:', err);
    });
}

module.exports = {
  initSocketBridge,
  publishSocketDispatch,
  subscribeSocketDispatch,
};
