const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/** uploads/dosya.jpg veya eski tam yol → tam URL */
export const getImageUrl = (photoPath) => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const base = API_URL.replace(/\/$/, '');
  const normalized = String(photoPath).replace(/\\/g, '/');
  const uploadsMatch = normalized.match(/uploads\/[^/]+$/i);
  const rel = uploadsMatch ? uploadsMatch[0] : normalized.replace(/^\//, '');
  return `${base}/${rel}`;
};

export default API_URL;
