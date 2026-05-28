const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');

function toPublicUploadPath(file) {
  if (!file) return null;
  if (file.filename) {
    return `uploads/${file.filename}`;
  }
  const rel = path.relative(SERVER_ROOT, file.path).replace(/\\/g, '/');
  if (rel.startsWith('uploads/')) return rel;
  return `uploads/${path.basename(file.path)}`;
}

function normalizePhotoUrl(stored) {
  if (!stored) return null;
  const s = String(stored).replace(/\\/g, '/').trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;

  const uploadsMatch = s.match(/uploads\/[^/]+$/i);
  if (uploadsMatch) return uploadsMatch[0];

  if (s.startsWith('uploads/')) return s;

  const base = path.basename(s);
  if (base && base !== '.' && base !== '..') {
    return `uploads/${base}`;
  }
  return null;
}

function resolveUploadFilePath(stored) {
  const rel = normalizePhotoUrl(stored);
  if (!rel) return null;
  return path.join(SERVER_ROOT, rel);
}

function normalizeVehicleRow(vehicle) {
  if (!vehicle) return vehicle;
  const out = { ...vehicle };
  if (out.photo_url !== undefined) {
    out.photo_url = normalizePhotoUrl(out.photo_url);
  }
  if (Array.isArray(out.photos)) {
    out.photos = out.photos.map((p) => ({
      ...p,
      photo_url: normalizePhotoUrl(p.photo_url),
    }));
  }
  return out;
}

function normalizeVehiclesList(vehicles) {
  return (vehicles || []).map(normalizeVehicleRow);
}

async function migratePhotoUrlsInDb(pool) {
  const [rows] = await pool.query('SELECT id, photo_url FROM vehicle_photos');
  let updated = 0;
  for (const row of rows) {
    const fixed = normalizePhotoUrl(row.photo_url);
    if (fixed && fixed !== row.photo_url) {
      await pool.query('UPDATE vehicle_photos SET photo_url = ? WHERE id = ?', [
        fixed,
        row.id,
      ]);
      updated += 1;
    }
  }
  if (updated > 0) {
    console.log(`✅ ${updated} fotoğraf yolu veritabanında düzeltildi (uploads/... formatına).`);
  }
}

module.exports = {
  SERVER_ROOT,
  toPublicUploadPath,
  normalizePhotoUrl,
  resolveUploadFilePath,
  normalizeVehicleRow,
  normalizeVehiclesList,
  migratePhotoUrlsInDb,
};
