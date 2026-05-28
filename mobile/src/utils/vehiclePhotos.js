export const appendPhotosToFormData = (formData, assets) => {
  assets.forEach((asset, index) => {
    const name =
      asset.fileName ||
      `photo_${Date.now()}_${index}.${asset.mimeType?.includes('png') ? 'png' : 'jpg'}`;
    formData.append('photos', {
      uri: asset.uri,
      name,
      type: asset.mimeType || 'image/jpeg',
    });
  });
};

export const buildVehicleFormData = (payload, photoAssets = []) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  appendPhotosToFormData(formData, photoAssets);
  return formData;
};

export const buildPhotosOnlyFormData = (photoAssets) => {
  const formData = new FormData();
  appendPhotosToFormData(formData, photoAssets);
  return formData;
};

const PHOTO_BATCH_SIZE = 2;


export async function uploadVehiclePhotosInBatches(vehicleId, assets, apiClient, batchSize = PHOTO_BATCH_SIZE) {
  if (!assets?.length) return;

  for (let i = 0; i < assets.length; i += batchSize) {
    const chunk = assets.slice(i, i + batchSize);
    const formData = buildPhotosOnlyFormData(chunk);
    await apiClient.post(`/vehicles/${vehicleId}/add-photos`, formData, {
      timeout: 120000,
    });
  }
}

export function formatUploadError(err) {
  const data = err.response?.data;
  const msg = data?.message || err.message || 'Kayıt başarısız.';
  const hint = data?.hint;
  if (hint) return `${msg} (${hint})`;
  if (err.code === 'ECONNABORTED') {
    return 'Yükleme zaman aşımına uğradı. Daha az fotoğraf veya daha küçük görseller deneyin.';
  }
  return msg;
}
