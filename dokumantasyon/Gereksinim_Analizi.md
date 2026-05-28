# Oto Galeri Yönetim Sistemi — Gereksinim Analizi Raporu

---

## 1. Projenin Amacı

Galerio, oto galerilerinin araç envanterini, personel bilgilerini ve müşteri iletişimini dijital ortamda yönetmesine imkân tanıyan tam yığınlı (full-stack) bir yönetim platformudur.

Sistem üç temel kullanıcı deneyimi sunar:
- **Müşteri / Kullanıcı:** Araçları inceleme, kredi hesaplama, piyasa değeri araştırma ve galeri yetkilileriyle gerçek zamanlı mesajlaşma.
- **Galeri Yöneticisi (Admin):** Araç ve personel yönetimi, müşteri mesajlarına yanıt verme, bildirim takibi.
- **Sistem:** Otomatik veritabanı temizliği (cron), mesaj kuyruğu işleme (worker), önbellek yönetimi.

---

## 2. Kullanıcı Rolleri ve Yetkileri

### 2.1 Normal Kullanıcı (`role: user`)

Sisteme kayıt olabilir, giriş yapabilir, şifresini sıfırlayabilir.

Yapabilecekleri:
- Araç ilanlarını listeleme ve detaylı inceleme (çoklu fotoğraf, teknik özellikler)
- Fotoğraflara tam ekran / yakınlaştırma ile bakma (web + mobil)
- Seçtiği araç için admin ile birebir gerçek zamanlı sohbet başlatma
- Geçmiş sohbetlerini görüntüleme, gizleme; kendi mesajlarını silme
- Kredi hesaplama modülünü kullanma
- Araçların tahmini piyasa değerini öğrenme (Sahibinden / Arabam linkleri)
- Push bildirimi alma (mobil)

### 2.2 Sistem Yöneticisi (`role: admin`)

Normal kullanıcıların tüm yetkilerine ek olarak yönetim paneline erişir.

Yapabilecekleri:
- **Araç yönetimi:** Araç ekleme / düzenleme / silme; araç başına en fazla 10 fotoğraf yükleme / silme
- **Personel yönetimi:** Galeri çalışanı ekleme, güncelleme, silme (TC kimlik, maaş, pozisyon, tarih bilgileri)
- **Müşteri iletişimi:** Gelen kullanıcı mesajlarını okuma, anlık yanıt verme, sohbet gizleme; kendi mesajlarını silme
- **Bildirim yönetimi:** Okunmamış mesaj sayısını görme, tüm bildirimleri okundu olarak işaretleme

---

## 3. Fonksiyonel Gereksinimler

### 3.1 Kimlik Doğrulama

- Kullanıcı kaydı e-posta + şifre ile yapılır; şifre en az 6 karakter olmalıdır.
- Giriş başarılıysa 8 saat geçerli JWT (JSON Web Token) döner.
- Tüm korumalı işlemlerde `Authorization: Bearer <token>` başlığı zorunludur.
- Admin işlemleri için `role: admin` kontrolü ek olarak yapılır.

### 3.2 Şifre Sıfırlama

- Kullanıcı e-posta adresini girer; sisteme özgü 6 haneli güvenlik kodu üretilir.
- Kod, SendGrid üzerinden e-posta ile iletilir (API anahtarı yoksa konsola yazılır).
- Kullanıcı kodu ve yeni şifreyi girerek şifresini değiştirir.
- Kodun geçerlilik süresi sona erdiğinde yeni kod talep edilmesi gerekir.

### 3.3 Araç Yönetimi

- Her araca marka, model, yıl, renk, vites, yakıt tipi, kilometre, alış fiyatı, satış fiyatı ve açıklama alanları girilebilir.
- Araç başına en fazla 10 fotoğraf yüklenebilir; her fotoğraf en fazla 8 MB olabilir.
- Fotoğraflar Cloudinary üzerinde kalıcı olarak saklanır.
- Araç silindiğinde ilgili fotoğraflar ve sohbet geçmişi de veritabanından kaldırılır.

### 3.4 Personel Yönetimi

- Personel kaydında TC kimlik numarası, ad, soyad, telefon, doğum tarihi, işe başlama tarihi, adres, pozisyon ve maaş bilgileri saklanır.
- TC kimlik numarası sistemde benzersiz (unique) olmalıdır.

### 3.5 Gerçek Zamanlı Mesajlaşma

- Mesajlaşma Socket.IO üzerinden gerçekleşir; sayfa yenilenmeden anlık iletişim sağlanır.
- Her sohbet `user_{userId}_vehicle_{vehicleId}_admin_{adminId}` formatında benzersiz bir oda kimliğine sahiptir.
- Mesajlar önce RabbitMQ kuyruğuna yazılır; `worker` servisi kuyruğu dinleyerek mesajları MySQL'e kaydeder.
- RabbitMQ erişilemez durumdaysa mesajlar doğrudan API tarafında işlenir (yedek akış).
- Admin ve kullanıcı okunmamış mesaj sayılarını ayrı ayrı takip edebilir.
- Kullanıcılar ve adminler kendi gönderdikleri mesajları tek tek silebilir.
- Sohbetler kullanıcı veya admin tarafından gizlenebilir (`hidden_conversations`).

### 3.6 Kredi Hesaplama

- Kredi tutarı, vade (ay) ve aylık faiz oranı girilerek taksit planı hesaplanır.
- KKDF (%1) ve BSMV (%5) otomatik uygulanır.
- Her taksit için tarih, taksit tutarı, anapara, faiz, BSMV ve KKDF ayrıştırılarak listelenir.
- İlgili banka kredi sayfalarına yönlendirme linkleri sunulur.

### 3.7 Piyasa Değeri Araştırma

- Kullanıcı marka, model, yıl, yakıt tipi ve vites bilgisini seçer.
- Sistem, Sahibinden.com ve Arabam.com için önceden oluşturulmuş arama URL'leri üretir.

### 3.8 Bildirimler (Mobil)

- Yeni mesaj geldiğinde mobil cihaza push bildirimi gönderilir (`expo-notifications`).
- Uygulama arka planda olsa bile bildirim alınır.

### 3.9 Önbellek (Redis)

- Araç listesi (`GET /api/vehicles`) 60 saniye Redis'te önbelleğe alınır.
- Araç detayı (`GET /api/vehicles/:id`) ayrıca önbelleğe alınır.
- Araç eklendiğinde, güncellendiğinde veya silindiğinde önbellek otomatik geçersiz kılınır.
- Redis yoksa sistem veritabanından çalışmaya devam eder (graceful fallback).

### 3.10 Otomatik Veritabanı Temizliği

- Cron job her gece 00:00'da (Europe/Istanbul) çalışır.
- 30 günden eski mesajlar veritabanından otomatik silinir.

---

## 4. Teknik Gereksinimler

### 4.1 Sunucu (Backend)

| Gereksinim | Teknoloji / Detay |
|------------|-------------------|
| Web çerçevesi | Node.js + Express 5 |
| Gerçek zamanlı iletişim | Socket.IO 4.x |
| Kimlik doğrulama | JWT (`jsonwebtoken`) + `bcryptjs` (şifre hash) |
| Veritabanı istemcisi | `mysql2` (connection pool, keep-alive, SSL) |
| Önbellek | `ioredis` |
| Mesaj kuyruğu | `amqplib` (RabbitMQ) |
| Fotoğraf yükleme | `multer` + `cloudinary` SDK |
| E-posta | `nodemailer` + SendGrid transport |
| Zamanlanmış görev | `node-cron` |
| HTTP istekleri (sunucu içi) | `axios` |
| Ortam değişkenleri | `dotenv` |

**Ortam değişkenleri (server):**

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Sunucu portu (varsayılan: 5000) |
| `JWT_SECRET` | Token imzalama anahtarı |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL kullanıcı adı |
| `DB_PASSWORD` | MySQL şifresi |
| `DB_NAME` | Veritabanı adı |
| `DB_SSL` | SSL kullanımı (`true`/`false`) |
| `DB_SSL_CA` | CA sertifika içeriği (isteğe bağlı) |
| `REDIS_URL` | Redis bağlantı URL'si |
| `RABBITMQ_URL` | RabbitMQ bağlantı URL'si |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary bulut adı |
| `CLOUDINARY_API_KEY` | Cloudinary API anahtarı |
| `CLOUDINARY_API_SECRET` | Cloudinary API gizli anahtarı |
| `SENDGRID_API_KEY` | SendGrid e-posta servisi anahtarı |
| `CLIENT_URL` | CORS izinli istemci URL'si |
| `ADMIN_EMAIL` | Otomatik oluşturulacak admin e-postası |
| `ADMIN_PASSWORD` | Admin şifresi |
| `ADMIN_NAME` | Admin görünen adı |

### 4.2 Web İstemcisi (Frontend)

| Gereksinim | Teknoloji / Detay |
|------------|-------------------|
| Çerçeve | React 18 |
| Yönlendirme | React Router DOM 6 (SPA mimarisi) |
| HTTP istemcisi | Axios |
| Socket istemcisi | `socket.io-client` |
| Token ayrıştırma | `jwt-decode` |
| İkon kütüphanesi | `react-icons` |

**Ortam değişkenleri (client):**

| Değişken | Açıklama |
|----------|----------|
| `REACT_APP_API_URL` | API sunucusunun tam adresi |

### 4.3 Mobil İstemci

| Gereksinim | Teknoloji / Detay |
|------------|-------------------|
| Framework | React Native 0.81 + Expo ~54 |
| Navigasyon | React Navigation (Stack + Bottom Tabs + Drawer) |
| HTTP istemcisi | Axios (60 sn timeout; token interceptor) |
| Socket istemcisi | `socket.io-client` |
| Durum yönetimi | Zustand |
| Oturum saklama | `@react-native-async-storage/async-storage` |
| Fotoğraf seçimi | `expo-image-picker` (kamera + galeri) |
| Bildirimler | `expo-notifications` (push notification) |
| Animasyon | `expo-linear-gradient`, `react-native-reanimated` |
| Build sistemi | EAS Build (Android APK/AAB + iOS IPA) |
| Dil | JavaScript + TypeScript tanım dosyaları |

**Ortam değişkenleri (mobile):**

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_API_URL` | API sunucusunun tam adresi |

### 4.4 Veritabanı Şeması

**Tablolar:** `users`, `vehicles`, `vehicle_photos`, `messages`, `personnel`, `hidden_conversations`

**İlişkiler:**
- `vehicles.user_id` → `users.id` (ON DELETE SET NULL)
- `vehicle_photos.vehicle_id` → `vehicles.id` (ON DELETE CASCADE)
- `messages.sender_id`, `messages.receiver_id` → `users.id` (ON DELETE CASCADE)
- `messages.vehicle_id` → `vehicles.id` (ON DELETE SET NULL)
- `hidden_conversations.user_id` → `users.id` (ON DELETE CASCADE)

**İndeksler:** `messages(conversation_id)`, `messages(receiver_id)`, `hidden_conversations(user_id)`

**Karakter seti:** `utf8mb4` (Türkçe karakter desteği)

### 4.5 Altyapı ve DevOps

| Gereksinim | Teknoloji / Detay |
|------------|-------------------|
| Kapsayıcılama | Docker Compose (5 servis: api, worker, mysql, redis, rabbitmq) |
| Sürekli entegrasyon | GitHub Actions (syntax kontrolü, web build, mobil lint, docker build) |
| Otomatik dağıtım | Render deploy hook (CD — `main` push sonrası tetiklenir) |
| Web hosting | Vercel |
| API hosting | Render |
| Veritabanı hosting | Aiven Managed MySQL |
| Fotoğraf depolama | Cloudinary |

---

## 5. Güvenlik Gereksinimleri

- Şifreler `bcryptjs` ile hash'lenerek saklanır; düz metin şifre veritabanında tutulmaz.
- JWT token'lar 8 saat geçerlidir; sunucuda oturum state tutulmaz.
- Admin işlemleri çift katmanlı kontrol ile korunur: token doğrulama + rol kontrolü.
- Dosya yükleme boyutu 8 MB/fotoğraf ve 10 fotoğraf/istek ile sınırlıdır.
- Sohbete katılım esnasında kullanıcının yalnızca kendi konuşmalarına erişebildiği kontrol edilir.
- Mesaj silme işleminde kullanıcının yalnızca kendi mesajlarını silebildiği doğrulanır.
- Veritabanı bağlantıları SSL/TLS ile şifrelenir (Aiven/bulut ortamında zorunlu).
- CORS politikası `CLIENT_URL` ortam değişkeni ile yapılandırılır.

---

## 6. Performans ve Ölçeklenebilirlik Gereksinimleri

- Araç listesi ve detay sorguları Redis önbelleği ile tekrarlayan veritabanı sorgularını azaltır.
- MySQL connection pool (`connectionLimit: 10`, `enableKeepAlive`) ile bağlantı yönetimi optimize edilmiştir.
- Mesaj işleme RabbitMQ kuyruğu üzerinden asenkron olarak gerçekleştirilir; yüksek eşzamanlı istek sayısında sistem kararlı kalır.
- Worker servisi, API sunucusundan bağımsız olarak ölçeklendirilebilir.

---

## 7. Sistem Mimarisi

```
┌─────────────────────────────────────────────┐
│             İstemciler                      │
│  React Web (Vercel)  │  Expo Mobil (APK)    │
└──────────────┬────────────────┬─────────────┘
               │  HTTP / WS     │
               ▼                ▼
┌─────────────────────────────────────────────┐
│          API Sunucusu (Render)              │
│  Express 5 + Socket.IO 4                    │
│  JWT Auth │ REST API │ Dosya Yükleme        │
└────┬───────┬───────────────┬────────────────┘
     │       │               │
     ▼       ▼               ▼
  MySQL   Redis          RabbitMQ
 (Aiven)  (cache +     (galerio.messages
          pub/sub)       kuyruğu)
                            │
                            ▼
               ┌─────────────────────┐
               │   Worker Servisi    │
               │  (Docker container) │
               │  Mesajları işler,   │
               │  MySQL'e yazar,     │
               │  Redis'e publish    │
               └─────────────────────┘

  Fotoğraflar: Cloudinary (bulut depolama)
```
