# Cloudinary — kalıcı araç fotoğrafları

Render sunucusu her deploy’da `uploads/` klasörünü siler. Cloudinary ile fotoğraflar bulutta kalır.

## Kurulum (5 dk)

1. https://cloudinary.com/users/register_free — ücretsiz hesap
2. **Dashboard** → **API Keys** → Cloud name, API Key, API Secret kopyalayın
3. **Render** → galerio-api → **Environment** → Add:
   - `CLOUDINARY_CLOUD_NAME` = (cloud name)
   - `CLOUDINARY_API_KEY` = ...
   - `CLOUDINARY_API_SECRET` = ...
4. **Manual Deploy** veya otomatik deploy bekleyin
5. `/api/health` cevabında `"photoStorage": "cloudinary"` görünmeli
6. Admin’den araç fotoğraflarını **yeniden yükleyin** (eski yerel dosyalar kurtarılamaz)

## Yerel geliştirme

`server/.env` dosyasına aynı üç değişkeni ekleyin. Yoksa fotoğraflar `server/uploads/` altında kalır.

## Ücretsiz plan

Günlük trafik ve depolama limiti vardır; küçük/orta galeri için genelde yeterlidir.
