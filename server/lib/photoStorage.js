const fs = require('fs');
const { toPublicUploadPath, resolveUploadFilePath } = require('./uploadPaths');
const {
  isCloudinaryEnabled,
  initCloudinary,
  uploadFiles,
  deleteByUrl,
} = require('./cloudinaryStorage');

let initialized = false;

function ensurePhotoStorage() {
  if (initialized) return;
  if (isCloudinaryEnabled()) {
    initCloudinary();
    console.log('☁️ Fotoğraflar Cloudinary üzerinde saklanacak.');
  } else {
    console.log('📁 Fotoğraflar yerel uploads/ klasöründe saklanacak (Render deploy sonrası silinebilir).');
  }
  initialized = true;
}

function useCloudinary() {
  ensurePhotoStorage();
  return isCloudinaryEnabled();
}

/** Multer storage: Cloudinary açıksa bellek, değilse disk */
function createMulterStorage(uploadsDir, multer) {
  ensurePhotoStorage();
  if (isCloudinaryEnabled()) {
    return multer.memoryStorage();
  }
  const path = require('path');
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname || '.jpg'));
    },
  });
}

async function saveUploadedPhotos(files) {
  if (!files?.length) return [];
  ensurePhotoStorage();
  if (isCloudinaryEnabled()) {
    return uploadFiles(files);
  }
  return files.map((f) => toPublicUploadPath(f));
}

async function removeStoredPhoto(photoUrl) {
  if (!photoUrl) return;
  ensurePhotoStorage();
  if (photoUrl.startsWith('http') && photoUrl.includes('cloudinary.com')) {
    try {
      await deleteByUrl(photoUrl);
    } catch (err) {
      console.warn('Cloudinary silme uyarısı:', err.message);
    }
    return;
  }
  const fullPath = resolveUploadFilePath(photoUrl);
  if (!fullPath) return;
  await new Promise((resolve) => {
    fs.unlink(fullPath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('Dosya silme hatası:', err);
      resolve();
    });
  });
}

module.exports = {
  ensurePhotoStorage,
  useCloudinary,
  createMulterStorage,
  saveUploadedPhotos,
  removeStoredPhoto,
};
