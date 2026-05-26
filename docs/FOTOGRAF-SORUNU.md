# Fotoğraf görünmüyor — tek sayfalık özet

## Canlı adresleriniz

| Ne | URL |
|----|-----|
| Web | https://galerio-pink.vercel.app |
| API (Vercel bunu kullanıyor) | **https://galerio-xsmd.onrender.com** |
| Diğer Render servisi (web bunu KULLANMIYOR) | bayramlarauto.onrender.com |

## Kök neden (2 madde)

1. **Dosyalar sunucu diskindeydi** — Render her deploy’da `uploads/` siler → URL var, dosya **404**.
2. **Cloudinary yanlış servise kuruldu** — env’ler `bayramlarauto`’da; site `galerio-xsmd`’ye bağlı.

## Çözüm (4 adım)

1. Render → **galerio-xsmd** servisi (bayramlarauto değil).
2. Environment → Cloudinary 3 değişken + mevcut DB/JWT aynen kalsın.
3. Manual Deploy → commit `8f45bfb` (Cloudinary kodu).
4. Admin → araç fotoğraflarını **yeniden yükle** (bir kez).

Kontrol: `https://galerio-xsmd.onrender.com/api/health` → `"photoStorage": "cloudinary"`

Yeni fotoğraf URL’leri `https://res.cloudinary.com/...` ile başlar.
