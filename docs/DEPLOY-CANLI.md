# Canlı ortam — tek kaynak

## Mimari

| Katman | Adres |
|--------|--------|
| **Web** | https://galerio-pi.vercel.app |
| **API** | https://bayramlarauto.onrender.com |
| **MySQL** | Aiven (`defaultdb` veya `galerio`) |
| **Fotoğraf** | Cloudinary |

**Kullanmayın:** `galerio-xsmd.onrender.com` (eski servis; veri taşınana kadar sadece dump için)

Detaylı analiz: `docs/CANLI-SISTEM-OZET.md`

---

## Render (bayramlarauto)

**Environment** (zorunlu):

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

JWT_SECRET=...
CLIENT_URL=*
```

Sağlık: https://bayramlarauto.onrender.com/api/health

---

## Vercel

```env
REACT_APP_API_URL=https://bayramlarauto.onrender.com
```

Değiştirdikten sonra **Redeploy** (Clear build cache önerilir).

Repoda: `client/.env.production`

---

## Mobil

`mobile/eas.json` → `EXPO_PUBLIC_API_URL=https://bayramlarauto.onrender.com`

Değişiklikten sonra yeni EAS build.

---

## Fotoğraflar

Admin → `/admin/vehicles` → yeniden yükle. URL `res.cloudinary.com` olmalı.
