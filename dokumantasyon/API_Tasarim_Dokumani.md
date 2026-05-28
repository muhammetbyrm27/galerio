# Oto Galeri Yönetim Sistemi — REST API Tasarım Dökümanı

Tüm API yanıtları JSON formatındadır. Korumalı endpoint'ler `Authorization: Bearer <token>` başlığı gerektirir.

**Base URL (Production):** `https://bayramlarauto.onrender.com`

---

## Genel Middleware

| Middleware | Açıklama |
|------------|----------|
| `authenticateToken` | JWT doğrulama; geçersiz token'da 401/403 döner |
| `requireAdmin` | `role: admin` olmayan isteklerde 403 döner |
| Multer | Fotoğraf yükleme; max **8 MB / fotoğraf**, max **10 fotoğraf / istek** |

---

## 1. Sistem Durumu

### `GET /api/health`
**Yetki:** Herkese açık

Tüm servislerin (veritabanı, Redis, RabbitMQ, fotoğraf depolama) durumunu döner.

**Örnek yanıt (200):**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "rabbitmq": "connected",
  "queue": "galerio.messages",
  "photoStorage": "cloudinary",
  "uptime": 3600
}
```

---

## 2. Kimlik Doğrulama ve Kullanıcı İşlemleri

### `POST /api/register`
**Yetki:** Herkese açık

Yeni kullanıcı kaydı oluşturur. Rol her zaman `user` olarak atanır.

**Body (JSON):**
```json
{ "name": "Ad Soyad", "email": "email@ornek.com", "password": "min6karakter" }
```

**Yanıtlar:**
- `201 Created` — Kayıt başarılı
- `400 Bad Request` — Eksik alan veya e-posta zaten kayıtlı

---

### `POST /api/login`
**Yetki:** Herkese açık

E-posta ve şifre ile kimlik doğrulama; başarılı girişte JWT döner.

**Body (JSON):**
```json
{ "email": "email@ornek.com", "password": "sifre" }
```

**Yanıtlar:**
- `200 OK` — `{ "token": "JWT_TOKEN", "role": "user" }`
- `401 Unauthorized` — Hatalı e-posta veya şifre
- `503 Service Unavailable` — `JWT_SECRET` tanımlı değil

---

### `GET /api/admin-user`
**Yetki:** Token gerekli

Sistemdeki ilk admin kullanıcının `id` ve `name` bilgisini döner. Sohbet oluşturma sırasında kullanılır.

**Yanıt (200):**
```json
{ "id": 1, "name": "Galeri Admin" }
```

---

### `POST /api/request-password-reset`
**Yetki:** Herkese açık

Kayıtlı e-postaya 6 haneli şifre sıfırlama kodu gönderir.

**Body:** `{ "email": "email@ornek.com" }`

**Yanıtlar:** `200 OK` / `404 Not Found`

---

### `POST /api/verify-and-reset-password`
**Yetki:** Herkese açık

Güvenlik kodu ve yeni şifre ile şifre değişikliği yapar.

**Body:** `{ "email": "...", "code": "123456", "newPassword": "yenisifre" }`

**Yanıtlar:** `200 OK` / `400 Bad Request` (geçersiz/süresi dolmuş kod)

---

## 3. Araç İşlemleri

### `GET /api/vehicles`
**Yetki:** Herkese açık | **Önbellek:** Redis (60 sn)

Tüm araçları ana fotoğrafıyla birlikte döner. Yanıt başlığında `X-Cache: HIT/MISS/BYPASS` değeri bulunur.

**Yanıt (200):**
```json
[
  {
    "id": 1,
    "brand": "Ford",
    "model": "Focus",
    "year": 2021,
    "color": "Beyaz",
    "gear": "Otomatik",
    "fuel": "Benzin",
    "mileage": 45000,
    "sale_price": "350000.00",
    "description": "Açıklama...",
    "photo_url": "https://res.cloudinary.com/..."
  }
]
```

---

### `GET /api/vehicles/:id`
**Yetki:** Herkese açık | **Önbellek:** Redis

Araç detayı ve tüm fotoğraflarını döner.

**Yanıt (200):**
```json
{
  "id": 1,
  "brand": "Ford",
  "model": "Focus",
  "photos": [
    { "id": 10, "photo_url": "https://res.cloudinary.com/..." },
    { "id": 11, "photo_url": "https://res.cloudinary.com/..." }
  ]
}
```

---

### `POST /api/vehicles`
**Yetki:** Admin + Token | **İçerik:** `multipart/form-data`

Yeni araç ekler. `photos` alanıyla aynı anda en fazla 10 fotoğraf yüklenebilir.

**Form alanları:** `brand`, `model`, `year`, `color`, `gear`, `fuel`, `mileage`, `purchase_price`, `sale_price`, `description`, `photos` (dosya, tekrarlanabilir)

**Yanıt:** `201 Created` — `{ "vehicleId": 5, "message": "Araç eklendi" }`

---

### `PUT /api/vehicles/:id`
**Yetki:** Admin + Token

Araç meta verilerini günceller (fotoğraf değişikliği bu endpoint ile yapılmaz).

**Body (JSON):** Güncellenecek alanlar (`brand`, `model`, `year` vb.)

**Yanıt:** `200 OK`

---

### `POST /api/vehicles/:id/add-photos`
**Yetki:** Admin + Token | **İçerik:** `multipart/form-data`

Mevcut araca ek fotoğraf yükler.

**Form alanı:** `photos` (dosya)

**Yanıt:** `200 OK` — `{ "photos": [...] }`

---

### `DELETE /api/photos/:id`
**Yetki:** Admin + Token

Tek bir fotoğrafı hem veritabanından hem Cloudinary'den siler.

**Yanıt:** `200 OK`

---

### `DELETE /api/vehicles/:id`
**Yetki:** Admin + Token

Aracı, tüm fotoğraflarını ve bu araca ait sohbet geçmişini veritabanından kalıcı olarak siler (transaction ile).

**Yanıt:** `200 OK`

---

## 4. Personel İşlemleri

### `GET /api/personnel`
**Yetki:** Admin + Token

Tüm personel kayıtlarını listeler.

---

### `POST /api/personnel`
**Yetki:** Admin + Token

Yeni personel kaydı ekler. TC kimlik numarası sistemde benzersiz olmalıdır.

**Body (JSON):** `ad`, `soyad`, `tc_kimlik`, `telefon`, `dogum_tarihi`, `ise_baslama_tarihi`, `adres`, `pozisyon`, `maas`

**Yanıtlar:** `201 Created` / `409 Conflict` (TC zaten kayıtlı)

---

### `PUT /api/personnel/:id`
**Yetki:** Admin + Token

Personel bilgisini günceller.

---

### `DELETE /api/personnel/:id`
**Yetki:** Admin + Token

Personel kaydını siler.

---

## 5. Mesajlaşma ve Sohbet İşlemleri

> Mesaj içeriği WebSocket (Socket.IO) üzerinden iletilir. Sohbet listesi, silme ve gizleme işlemleri REST API üzerinden yapılır.

### `GET /api/user-conversations`
**Yetki:** Token (`role: user`)

Giriş yapmış kullanıcının tüm sohbet özetlerini döner. Her sohbet için araç bilgisi, son mesaj, okunmamış sayısı ve araç fotoğrafı içerir.

---

### `GET /api/conversations`
**Yetki:** Admin + Token

Admin gelen kutusunu döner. Her sohbet için kullanıcı adı, araç özeti, son mesaj ve okunmamış sayısı içerir.

---

### `DELETE /api/messages/:id`
**Yetki:** Token (gönderen sahiplik kontrolü)

Kullanıcı veya admin yalnızca kendi gönderdiği mesajı siler. Silme işlemi Socket.IO ile anlık yansıtılır.

---

### `DELETE /api/user/conversations/:conversationId`
**Yetki:** Token (`role: user`, sohbet sahipliği)

Sohbeti kullanıcının gelen kutusundan gizler (`hidden_conversations`). Sohbet verisi silinmez.

---

### `DELETE /api/conversations/:conversationId`
**Yetki:** Admin + Token

Sohbeti admin gelen kutusundan gizler.

---

### `POST /api/inbox/clear`
**Yetki:** Token

Tüm sohbetleri kullanıcı veya admin gelen kutusundan temizler.

---

## 6. Bildirim İşlemleri

### `GET /api/notifications/unread-count`
**Yetki:** Admin + Token

Admin için okunmamış sohbet sayısını döner.

**Yanıt:** `{ "count": 3 }`

---

### `GET /api/user-notifications/unread-count`
**Yetki:** Token (`role: user`)

Kullanıcı için okunmamış mesaj sayısını döner.

---

### `POST /api/notifications/mark-all-read`
**Yetki:** Token

Admin veya kullanıcının tüm mesajlarını okundu olarak işaretler.

---

## 7. Kredi Hesaplama

### `POST /api/kredi/hesapla`
**Yetki:** Herkese açık

Taşıt kredisi taksit planı hesaplar. KKDF (%1) ve BSMV (%5) otomatik uygulanır.

**Body (JSON):**
```json
{
  "krediTutari": 200000,
  "vade": 36,
  "aylikFaizOrani": 2.5
}
```

**Yanıt (200):**
```json
{
  "plan": [
    {
      "ay": 1,
      "tarih": "2026-06-01",
      "taksitTutari": "7250.00",
      "anapara": "4583.00",
      "faiz": "5000.00",
      "bsmv": "250.00",
      "kkdf": "50.00"
    }
  ],
  "bankalar": [
    { "ad": "Ziraat Bankası", "link": "https://..." }
  ]
}
```

---

## 8. WebSocket (Socket.IO) API

**Bağlantı:** `io("https://bayramlarauto.onrender.com", { auth: { token: JWT } })`

### İstemci → Sunucu Olayları

| Olay | Parametreler | Açıklama |
|------|-------------|----------|
| `join_room` | `{ conversationId, token }` | Sohbet odasına katılır; geçmiş mesajlar `load_messages` ile döner |
| `leave_room` | `{ conversationId }` | Sohbet odasından ayrılır |
| `send_message` | `{ conversationId, message, vehicle_id }` | Mesaj gönderir (RabbitMQ → worker → MySQL → karşı tarafa iletim) |
| `admin_cleared_notifications` | `{ adminId }` | Admin bildirimlerini sıfırlar |
| `user_cleared_notifications` | `{ userId }` | Kullanıcı bildirimlerini sıfırlar |

### Sunucu → İstemci Olayları

| Olay | Açıklama |
|------|----------|
| `load_messages` | Odadaki geçmiş mesajlar (join_room yanıtı) |
| `receive_message` | Yeni gelen mesaj |
| `message_deleted` | Bir mesaj silindi bilgisi |
| `admin_new_unread_message` | Admin için okunmamış mesaj bildirimi |
| `admin_refresh_conversations` | Admin sohbet listesinin yenilenmesi gerektiği sinyali |
| `conversation_read_status_updated` | Okunma durumu değişti |
| `notifications_were_reset` | Admin bildirimleri sıfırlandı |
| `user_notifications_were_reset` | Kullanıcı bildirimleri sıfırlandı |
| `update_notification_count` | Bildirim sayacı güncelleme |

### Sohbet ID Formatı

```
user_{kullaniciId}_vehicle_{aracId}_admin_{adminId}
```

Örnek: `user_5_vehicle_12_admin_1`

---

## 9. Hata Kodları

| HTTP Kodu | Anlam |
|-----------|-------|
| 200 | Başarılı |
| 201 | Kaynak oluşturuldu |
| 400 | Geçersiz istek (eksik/hatalı alan) |
| 401 | Kimlik doğrulama gerekli (token yok) |
| 403 | Yetkisiz (token geçersiz veya rol yetersiz) |
| 404 | Kaynak bulunamadı |
| 409 | Çakışma (benzersizlik ihlali) |
| 500 | Sunucu hatası |
| 503 | Servis kullanılamıyor (eksik yapılandırma) |
