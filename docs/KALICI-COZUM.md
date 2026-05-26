# Kalıcı çözüm — tek Render servisi (bayramlarauto)

Render panelinde **yalnızca `bayramlarauto`** görünüyorsa doğru yol budur.  
`galerio-xsmd` eski / başka deploy adresi olabilir; yeni kurulumda **kullanmayın**.

---

## Tek mimari

```
Vercel (galerio-pi)  →  bayramlarauto.onrender.com  →  Aiven MySQL
                              ↓
                         Cloudinary (fotoğraflar)
```

---

## 4 adım

### 1) bayramlarauto Environment (Render)

**Environment** sekmesinde olmalı:

| Değişken | Örnek |
|----------|--------|
| `DB_HOST` | `mysql-....aivencloud.com` |
| `DB_PORT` | `12569` |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | (Aiven) |
| `DB_NAME` | `defaultdb` |
| `DB_SSL` | `true` (Aiven SSL; sertifika hatasi kodda duzeltildi) |
| `CLOUDINARY_CLOUD_NAME` | dolu |
| `CLOUDINARY_API_KEY` | dolu |
| `CLOUDINARY_API_SECRET` | dolu |

Kaydet → **Manual Deploy** (son commit `main`).

Kontrol: https://bayramlarauto.onrender.com/api/health  
→ `database: connected`, `photoStorage: cloudinary`

### 2) Vercel

`REACT_APP_API_URL` = **`https://bayramlarauto.onrender.com`**

`galerio-xsmd` **silin** veya üzerine yazın.

En üst deploy **Ready** → site **Ctrl+Shift+R**.

F12 → Network → istekler **bayramlarauto** olmalı.

### 3) Araçlar (5 araç xsmd’de kaldıysa)

bayramlarauto veritabanında **6 eski araç** veya farklı liste olabilir.

- Admin → `/admin/vehicles` → Fiat, Hyundai vb. **yeniden ekleyin**  
  veya eski kayıtları silip sadece güncel stoku tutun.

### 4) Fotoğraflar

Her araç → fotoğraf yükle → Kaydet.

Sağ tık URL: **`https://res.cloudinary.com/...`**

---

## galerio-xsmd neden hâlâ açılıyor?

Eski build veya eski Vercel `REACT_APP_API_URL` yüzünden site o adrese istek atıyor olabilir.  
Render’da servis yoksa ileride kapanır; **Vercel’i bayramlarauto yapınca** sorun biter.

---

## Kontrol listesi

- [ ] Tek Render servisi: bayramlarauto
- [ ] `/api/health` → connected + cloudinary
- [ ] Vercel → bayramlarauto
- [ ] Foto URL → res.cloudinary.com
- [ ] İstediğiniz araçlar admin’de kayıtlı
