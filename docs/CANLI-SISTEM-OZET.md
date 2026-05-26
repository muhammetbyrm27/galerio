# Galerio — Canlı sistem özeti (baştan sona)

## Ne yaptık?

| Adım | Durum | Not |
|------|--------|-----|
| Yerel MySQL yedeği | ✅ | `galerio-yedek.sql` |
| Aiven ücretsiz MySQL | ✅ | `defaultdb` |
| SQL import (Aiven) | ✅ | Tablolar: users, vehicles, … |
| Render **bayramlarauto** → Aiven + SSL | ✅ | `/api/health` → `database: connected` |
| Render **bayramlarauto** → Cloudinary env | ✅ | `photoStorage: cloudinary` |
| Vercel deploy | ✅ | Ama API adresi hâlâ yanlış olabilir |
| Fotoğraf yükleme | ⚠️ | **Yanlış sunucuya** gitti |

---

## Asıl sorun: İKİ Render API, İKİ veritabanı

| Servis | URL | Veritabanında ne var? |
|--------|-----|------------------------|
| **galerio-xsmd** | https://galerio-xsmd.onrender.com | **Güncel stok** (Fiat Linea, Hyundai i20, Volvo…) — sizin yüklediğiniz araçlar |
| **bayramlarauto** | https://bayramlarauto.onrender.com | **Eski yedek** (Audi A4, eski Renault…) — `galerio-yedek.sql` importu |

**Vercel / site şu an büyük ihtimalle `galerio-xsmd` kullanıyor** → fotoğraflar `galerio-xsmd.onrender.com/uploads/...` oluyor.

**Cloudinary + Aiven ise `bayramlarauto` üzerinde** → site oraya geçmeden kalıcı fotoğraf olmaz.

Bu yüzden iş uzadı: bir sunucuya DB kurduk, site başka sunucuya bağlı kaldı.

---

## Tek hedef mimari (bundan sonra)

```
Vercel (galerio-pi)  →  bayramlarauto.onrender.com  →  Aiven MySQL
                              ↓
                         Cloudinary (fotoğraflar)
```

**galerio-xsmd** → veriyi taşıdıktan sonra kapatın veya kullanmayın.

---

## Yapılacaklar (sırayla, tek seferlik)

### A) Güncel veriyi Aiven’e taşı (xsmd → Aiven)

1. Render → **galerio-xsmd** → **Environment** → `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` not edin.
2. Bilgisayarda xsmd veritabanından dump alın (host xsmd’nin DB’si):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -h XSMD_DB_HOST -P PORT -u USER -p --ssl-mode=REQUIRED XSMD_DB_NAME > xsmd-canli.sql
```

3. Aiven’e import (mevcut `defaultdb` üzerine yazar — eski import silinir):

```powershell
.\scripts\import-aiven.ps1
# veya: mysql ... defaultdb < xsmd-canli.sql
```

4. Kontrol: https://bayramlarauto.onrender.com/api/vehicles → Fiat / Hyundai görünmeli.

### B) Vercel API adresi

1. Vercel → **Environment Variables**
2. `REACT_APP_API_URL` = `https://bayramlarauto.onrender.com`
3. Eski `galerio-xsmd` değerini **silin veya üzerine yazın**
4. **Redeploy** (+ mümkünse Clear build cache)

Repoda: `client/.env.production` aynı adresi içerir (build yedek).

### C) Fotoğrafları Cloudinary’e yükle

1. Admin: https://galerio-pi.vercel.app/admin/vehicles
2. Her araç → fotoğrafları **yeniden yükle**
3. URL kontrolü: `https://res.cloudinary.com/...` (xsmd/uploads **olmamalı**)

### D) Mobil

- `mobile/eas.json` → `bayramlarauto` (repoda güncellendi)
- Yeni EAS build

### E) Temizlik (isteğe bağlı)

- Render **galerio-xsmd** servisini durdurun (karışıklık bitmesi için)
- Aiven şifresini rotate edin (ekran görüntüsünde paylaşıldıysa)

---

## Hızlı yol (veri taşımadan, geçici)

Sadece fotoğraf için acil çözüm — **iki API kalır**, önerilmez:

1. Render **galerio-xsmd** → Cloudinary env ekle (bayramlarauto ile aynı 3 değişken)
2. xsmd’de **Manual Deploy** (son `main` kodu)
3. Vercel **xsmd** kalsın, fotoğrafları tekrar yükle

Kalıcı çözüm yine **A + B + C**.

---

## Kontrol listesi

- [ ] https://bayramlarauto.onrender.com/api/health → connected + cloudinary
- [ ] https://bayramlarauto.onrender.com/api/vehicles → **sizin güncel araçlar**
- [ ] Vercel `REACT_APP_API_URL` → bayramlarauto
- [ ] Sitede F12 Network → istekler bayramlarauto
- [ ] Foto URL → res.cloudinary.com
- [ ] xsmd servisi kapatıldı (opsiyonel)

---

## Repoda düzeltilmesi gerekenler (bu commit ile)

- `client/.env.production` → bayramlarauto
- `mobile/eas.json` → bayramlarauto
- Eski dokümanlardaki galerio-xsmd referansları
- `docs/FOTOGRAF-SORUNU.md`, `docs/DEPLOY-CANLI.md`
