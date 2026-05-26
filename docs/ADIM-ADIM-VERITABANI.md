# Galerio — Bulut MySQL + Render (adım adım)

Railway MySQL kapalıysa **Aiven ücretsiz MySQL** kullanın (kredi kartı gerekmez).

---

## Adım 1 — Yerel yedek (bilgisayarınızda) ✅

Dosya oluşturuldu:

`galerio-yedek.sql` (proje kök klasöründe)

Yeniden almak isterseniz (PowerShell):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -pmb123 --single-transaction galerio > "galerio-yedek.sql"
```

---

## Adım 2 — Aiven’de ücretsiz MySQL

1. Tarayıcıda açın: https://console.aiven.io/signup  
   (Google veya GitHub ile giriş yeterli.)

2. **Create service** → **MySQL** seçin.

3. Plan: **Free** (1 GB RAM / 1 GB disk).

4. **Cloud provider & region:** Size yakın bir bölge (ör. `aws-eu-central-1`).

5. Service name: örn. `galerio-mysql` → **Create service**.

6. Servis **Running** olunca servise tıklayın → **Overview** sekmesi.

7. Şu bilgileri bir yere not edin (Connection information):

   | Alan | Örnek |
   |------|--------|
   | Host | `galerio-mysql-xxxxx.a.aivencloud.com` |
   | Port | `12345` (sizde farklı olur) |
   | User | `avnadmin` |
   | Password | (göster / kopyala) |
   | Database | `defaultdb` |

8. **SSL:** Aiven’de TLS zorunludur → Render’da `DB_SSL=true` kullanacağız.

**Adım 2 bittiğinde** bu 5 değeri (host, port, user, password, database adı) not edin; bir sonraki adımda SQL yedeğini bu sunucuya yükleyeceğiz.

---

## Adım 3 — Yedeği bulut MySQL’e aktarma

### Seçenek A — MySQL Workbench (kolay)

1. [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) kurulu değilse kurun.
2. **+** → yeni bağlantı:
   - Hostname: Aiven **Host**
   - Port: Aiven **Port**
   - Username: `avnadmin`
   - Password: Aiven şifresi
   - **SSL:** Required → Aiven konsolundan CA sertifikasını indirip Workbench’e ekleyin (servis → **Connection information** → CA certificate).
3. Bağlan → **Server** → **Data Import** → **Import from Self-Contained File** → `galerio-yedek.sql` seçin → **Start Import**.

### Seçenek B — Komut satırı

Aiven’den `ca.pem` indirin, sonra (yolları kendi değerlerinizle değiştirin):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" `
  -h HOST.aivencloud.com -P PORT -u avnadmin -p `
  --ssl-mode=VERIFY_CA --ssl-ca=ca.pem `
  defaultdb < galerio-yedek.sql
```

İsterseniz önce boş veritabanı oluşturun:

```sql
CREATE DATABASE IF NOT EXISTS galerio;
```

Sonra Render’da `DB_NAME=galerio` yazın ve dump’ı `galerio` veritabanına import edin.

---

## Adım 4 — Render (bayramlarauto) ortam değişkenleri

Render → **bayramlarauto** → **Environment**:

| Değişken | Değer |
|----------|--------|
| `DB_HOST` | Aiven host (localhost **değil**) |
| `DB_PORT` | Aiven port |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | Aiven şifresi |
| `DB_NAME` | `galerio` veya `defaultdb` (import ettiğiniz ad) |
| `DB_SSL` | `true` |

Cloudinary değişkenlerini **silmeden** bırakın:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Kaydet → **Manual Deploy** (veya otomatik deploy).

---

## Adım 5 — Kontrol

Tarayıcıda:

https://bayramlarauto.onrender.com/api/health

Beklenen:

```json
{
  "database": "connected",
  "photoStorage": "cloudinary"
}
```

`database: disconnected` görürseniz host/port/şifre/SSL’i tekrar kontrol edin.

---

## Adım 6 — Fotoğraflar

Eski `uploads/` dosyaları Render’da kalıcı değildi. Admin panelden (Vercel: https://galerio-pi.vercel.app) araç fotoğraflarını **yeniden yükleyin**; Cloudinary’de kalır.

---

## Adım 7 — Vercel ve mobil

- Vercel `REACT_APP_API_URL` = `https://bayramlarauto.onrender.com`
- Mobil `EXPO_PUBLIC_API_URL` aynı adres (yeniden build gerekir)

---

## Railway’i geri açmak ister misiniz?

Eski Railway projesi trial bittiği için kapalı. Ücretli plan veya yeni hesap gerekir; pratikte **Aiven Free** bu proje için yeterlidir.
