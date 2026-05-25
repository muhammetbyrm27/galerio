const formatPrice = (value) =>
  parseFloat(value || 0).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export function formatVehicleTitle(vehicle) {
  if (!vehicle) return 'Araç';
  const name = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
  if (!name) return 'Araç';
  return vehicle.year ? `${name} (${vehicle.year})` : name;
}

export function formatVehicleSubtitle(vehicle) {
  if (!vehicle) return '';
  const parts = [];
  if (vehicle.year && !`${vehicle.brand} ${vehicle.model}`.includes(String(vehicle.year))) {
    parts.push(String(vehicle.year));
  }
  if (vehicle.mileage != null && vehicle.mileage !== '') {
    parts.push(`${Number(vehicle.mileage).toLocaleString('tr-TR')} km`);
  }
  if (vehicle.color) parts.push(vehicle.color);
  if (vehicle.gear) parts.push(vehicle.gear);
  if (vehicle.fuel) parts.push(vehicle.fuel);
  if (vehicle.sale_price != null && vehicle.sale_price !== '') {
    parts.push(formatPrice(vehicle.sale_price));
  }
  return parts.join(' · ');
}

export function formatVehicleListLine(vehicle) {
  const title = formatVehicleTitle(vehicle);
  const sub = formatVehicleSubtitle(vehicle);
  return sub ? `${title} — ${sub}` : title;
}
