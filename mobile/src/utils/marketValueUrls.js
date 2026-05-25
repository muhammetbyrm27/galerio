const sahibindenFuelMap = {
  benzin: 'benzinli',
  lpg: 'benzin-lpg',
  dizel: 'dizel',
  hibrit: 'hibrit',
  elektrik: 'elektrikli',
};

const sahibindenGearMap = {
  manuel: 'manuel',
  otomatik: 'otomatik',
  'yari-otomatik': 'yari-otomatik',
};

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\+/g, '-plus')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const buildSahibindenUrl = (filters, getFinalBrand, getFinalModel) => {
  const finalBrand = getFinalBrand();
  const finalModel = getFinalModel();
  const pathParts = [];

  if (finalBrand) pathParts.push(slugify(finalBrand));
  if (finalModel) pathParts.push(slugify(finalModel));
  if (filters.fuel && sahibindenFuelMap[filters.fuel]) pathParts.push(sahibindenFuelMap[filters.fuel]);
  if (filters.gear && sahibindenGearMap[filters.gear]) pathParts.push(sahibindenGearMap[filters.gear]);

  const params = new URLSearchParams();
  if (filters.yearMin) params.append('a5_min', filters.yearMin);
  if (filters.yearMax) params.append('a5_max', filters.yearMax);
  if (filters.kmMin) params.append('a4_min', filters.kmMin);
  if (filters.kmMax) params.append('a4_max', filters.kmMax);

  let url = `https://www.sahibinden.com/${pathParts.join('/')}`;
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  return url;
};
