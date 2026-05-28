# Veritabanı Kurulumu — Bulut MySQL (Aiven)

Uygulama, yönetilen bulut MySQL servisi olarak [Aiven](https://aiven.io) kullanmaktadır.

---

## 1. Aiven Hesabı ve Servis Oluşturma

1. https://console.aiven.io adresinden ücretsiz hesap oluşturun (Google veya GitHub ile giriş yapılabilir)
2. **Create service** → **MySQL** seçin
3. Plan: **Free** (1 GB RAM / 1 GB disk)
4. Cloud provider & region: Yakın bir bölge seçin (örn. `aws-eu-central-1`)
5. Service name: `galerio-mysql` → **Create service**
6. Servis **Running** durumuna gelince **Overview** sekmesinde bağlantı bilgilerini not edin:

| Alan | Açıklama |
|------|----------|
| Host | `xxx.aivencloud.com` |
| Port | (servisinize özel) |
| User | `avnadmin` |
| Password | (Aiven konsolundan kopyalayın) |
| Database | `defaultdb` |

> **Not:** Aiven'de TLS/SSL zorunludur. Sunucu tarafında `DB_SSL=true` ayarlanmalıdır.

---

## 2. Veritabanı Şemasının Oluşturulması

Yerel Docker ortamında şema `docker/mysql/init.sql` dosyasından otomatik oluşturulur.

Bulut ortamı için şemayı elle uygulamak isterseniz:

```bash
mysql -h <aiven-host> -P <port> -u avnadmin -p \
  --ssl-mode=REQUIRED defaultdb < docker/mysql/init.sql
```

Uygulama ilk başlatıldığında `server/scripts/ensure-admin.js` çalışır ve varsayılan admin kullanıcısı otomatik olarak oluşturulur.

---

## 3. Render Ortam Değişkenleri

Render → `bayramlarauto` → **Environment** sekmesine aşağıdaki değişkenleri ekleyin:

| Değişken | Değer |
|----------|-------|
| `DB_HOST` | Aiven host adresi |
| `DB_PORT` | Aiven port numarası |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | Aiven şifresi |
| `DB_NAME` | `defaultdb` |
| `DB_SSL` | `true` |

---

## 4. Bağlantıyı Doğrulama

Render deploy tamamlandıktan sonra:

```
GET https://bayramlarauto.onrender.com/api/health
```

Beklenen yanıt:
```json
{
  "status": "ok",
  "database": "connected",
  "photoStorage": "cloudinary"
}
```

---

## 5. Yerel Geliştirme

Yerel ortamda Docker Compose kullanılır (`docker compose up -d --build`). MySQL, Redis ve RabbitMQ servisleri otomatik olarak başlatılır.

`server/.env` örnek dosyası için `server/.env.example` dosyasına bakın.
