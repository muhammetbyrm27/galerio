// Telefonda test: bilgisayarınızın yerel IP'si (örn. 192.168.1.42:5000)
// .env dosyasında EXPO_PUBLIC_API_URL=http://192.168.x.x:5000 tanımlayın
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = API_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
};

export default API_URL;
