const cloudinary = require('cloudinary').v2;

function isCloudinaryEnabled() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function initCloudinary() {
  if (!isCloudinaryEnabled()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return true;
}

function uploadBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || 'galerio/vehicles',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function uploadFiles(files) {
  const urls = [];
  for (const file of files) {
    if (!file.buffer) {
      throw new Error('Cloudinary için bellekte dosya gerekli (multer memoryStorage).');
    }
    const url = await uploadBuffer(file.buffer);
    urls.push(url);
  }
  return urls;
}

function publicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const lastDot = withoutVersion.lastIndexOf('.');
    return lastDot > 0 ? withoutVersion.slice(0, lastDot) : withoutVersion;
  } catch {
    return null;
  }
}

async function deleteByUrl(url) {
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = {
  isCloudinaryEnabled,
  initCloudinary,
  uploadFiles,
  deleteByUrl,
  publicIdFromUrl,
};
