# Fotoğraf sorunu — kök neden ve çözüm

## Kök neden

1. **İki Render API** vardı: `galerio-xsmd` (site buraya bağlı) ve `bayramlarauto` (Aiven + Cloudinary burada).
2. Fotoğraflar **Render diskine** (`/uploads/...`) yazıldı → deploy sonrası silinir.
3. **Cloudinary** yalnızca `bayramlarauto` ortamında açık; site `galerio-xsmd` kullanınca fotoğraflar xsmd diskine gitti.

## Kalıcı çözüm

Tek API: **https://bayramlarauto.onrender.com**

1. Güncel araç verisini xsmd DB’den Aiven’e taşıyın → `docs/CANLI-SISTEM-OZET.md` bölüm **A**
2. Vercel `REACT_APP_API_URL` → bayramlarauto → Redeploy
3. Admin’den fotoğrafları yeniden yükleyin
4. URL: `https://res.cloudinary.com/...`

## Kontrol

```text
GET https://bayramlarauto.onrender.com/api/health
→ "database": "connected", "photoStorage": "cloudinary"
```

Tarayıcıda fotoğrafa sağ tık → **res.cloudinary.com** olmalı.

## Yanlış (hâlâ görüyorsanız)

`https://galerio-xsmd.onrender.com/uploads/...` → Vercel hâlâ xsmd veya eski build; bkz. `docs/CANLI-SISTEM-OZET.md`
