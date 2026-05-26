// Telefonda test: bilgisayarınızın yerel IP'si (örn. 192.168.1.42:5000)
// .env dosyasında EXPO_PUBLIC_API_URL=http://192.168.x.x:5000 tanımlayın
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const getImageUrl = (path) => {
  if (!path) return null;
  const s = String(path).replace(/\\/g, '/');
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = API_URL.replace(/\/$/, '');
  const uploadsMatch = s.match(/uploads\/[^/]+$/i);
  const rel = uploadsMatch ? uploadsMatch[0] : s.replace(/^\//, '');
  return `${base}/${rel}`;
};

export default API_URL;
