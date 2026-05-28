# Canlı Ortam — Deployment Mimarisi

## Genel Mimari

```
Vercel (galerio-pi)         →    bayramlarauto.onrender.com    →    Aiven MySQL
    Web istemcisi                       Node.js API                   Bulut veritabanı
                                             ↓
                                      Cloudinary
                                  (Araç fotoğrafları)
```

---

## Servisler

| Katman | Adres | Açıklama |
|--------|-------|----------|
| **Web Arayüzü** | https://galerio-pi.vercel.app | React — kullanıcı & admin paneli |
| **API** | https://bayramlarauto.onrender.com | Node.js / Express — tüm iş mantığı |
| **Veritabanı** | Aiven MySQL | Yönetilen bulut MySQL |
| **Fotoğraf Depolama** | Cloudinary | Kalıcı araç fotoğrafları |

---

## Render — API Ortam Değişkenleri

`bayramlarauto` servisinde tanımlanması gereken değişkenler:

```env
DB_HOST=<aiven-host>
DB_PORT=<aiven-port>
DB_USER=avnadmin
DB_PASSWORD=<aiven-password>
DB_NAME=defaultdb
DB_SSL=true

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

JWT_SECRET=<guvenli-rastgele-deger>
CLIENT_URL=*
```

Kaydet → **Manual Deploy** veya GitHub'a push ile otomatik deploy.

---

## Vercel — Web İstemcisi

Vercel proje ayarları → **Environment Variables**:

```env
REACT_APP_API_URL=https://bayramlarauto.onrender.com
```

Değişiklik sonrası **Redeploy** gereklidir.

Repoda `client/.env.production` dosyası bu değeri içerir (build sırasında yedek).

---

## Mobil Uygulama

`mobile/eas.json` içinde API adresi tanımlıdır:

```json
"EXPO_PUBLIC_API_URL": "https://bayramlarauto.onrender.com"
```

API adresi değişirse yeni bir EAS Build alınması gerekir.

---

## Deployment Doğrulama

```
GET https://bayramlarauto.onrender.com/api/health
```

Beklenen yanıt:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "rabbitmq": "connected",
  "photoStorage": "cloudinary"
}
```
