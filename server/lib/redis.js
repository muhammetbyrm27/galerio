const Redis = require('ioredis');

const CACHE_KEYS = {
  vehiclesList: 'galerio:vehicles:list',
  vehicleDetail: (id) => `galerio:vehicles:detail:${id}`,
};

const DEFAULT_TTL_SEC = Number(process.env.REDIS_CACHE_TTL) || 60;

let client = null;
let redisReady = false;

function getRedisUrl() {
  return process.env.REDIS_URL || '';
}

function isRedisConfigured() {
  return Boolean(getRedisUrl());
}

async function connectRedis() {
  if (!isRedisConfigured()) {
    console.log('ℹ️ REDIS_URL tanımlı değil — önbellek devre dışı.');
    return false;
  }
  if (client && redisReady) return true;

  try {
    client = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
    });

    client.on('error', (err) => {
      redisReady = false;
      console.warn('⚠️ Redis bağlantı uyarısı:', err.message);
    });

    await client.ping();
    redisReady = true;
    console.log('✅ Redis önbellek bağlantısı hazır.');
    return true;
  } catch (err) {
    redisReady = false;
    console.warn('⚠️ Redis kullanılamıyor, DB doğrudan kullanılacak:', err.message);
    return false;
  }
}

async function pingRedis() {
  if (!client || !redisReady) return false;
  try {
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    redisReady = false;
    return false;
  }
}

async function getCache(key) {
  if (!redisReady || !client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Redis get hatası:', err.message);
    return null;
  }
}

async function setCache(key, value, ttlSec = DEFAULT_TTL_SEC) {
  if (!redisReady || !client) return false;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSec);
    return true;
  } catch (err) {
    console.warn('Redis set hatası:', err.message);
    return false;
  }
}

async function delCache(...keys) {
  if (!redisReady || !client || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch (err) {
    console.warn('Redis del hatası:', err.message);
  }
}

async function invalidateVehiclesCache(vehicleId = null) {
  const keys = [CACHE_KEYS.vehiclesList];
  if (vehicleId != null) {
    keys.push(CACHE_KEYS.vehicleDetail(vehicleId));
  }
  await delCache(...keys);
  console.log('🗑️ Araç önbelleği temizlendi:', keys.join(', '));
}

module.exports = {
  CACHE_KEYS,
  DEFAULT_TTL_SEC,
  connectRedis,
  pingRedis,
  isRedisConfigured,
  isRedisReady: () => redisReady,
  getCache,
  setCache,
  delCache,
  invalidateVehiclesCache,
};
