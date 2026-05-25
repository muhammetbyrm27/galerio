/** React Native FormData — sunucu `photos` alanı (multer array) */
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
