# Galerio — Araç Galerisi Yönetim Sistemi

Araç galerisi için geliştirilmiş tam yığınlı (full-stack) bir yönetim uygulaması.  
Müşteriler araç ilanlarını görüntüleyebilir, fiyat teklifi isteyebilir ve admin ile gerçek zamanlı mesajlaşabilir.

---

## Canlı Uygulama Linkleri

| Uygulama | Link |
|----------|------|
| **Web (Kullanıcı & Admin)** | https://bayramlarauto.vercel.app |
| **API (Render)** | https://bayramlarauto.onrender.com/api/health |
| **Mobil APK (Android)** | `mobile/eas.json` üzerinden EAS Build ile üretilir |

---

## Kullanılan Teknolojiler

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| Mobil uygulama | React Native (Expo 54) | Android & iOS uyumlu mobil arayüz |
| Web arayüzü | React 18 | Kullanıcı ve admin web paneli |
| API | Node.js, Express 5 | REST API — tüm işlemler burada yönetilir |
| Gerçek zamanlı mesajlaşma | Socket.io | Anlık bildirim ve sohbet |
| Veritabanı | MySQL (Aiven) | Araçlar, kullanıcılar, mesajlar |
| Fotoğraf depolama | Cloudinary | Araç ilanı fotoğrafları bulutta saklanır |
| Önbellek | Redis | Araç listesi hızlı yükleme cache |
| Mesaj kuyruğu | RabbitMQ | Mesajlar kuyruk üzerinden işlenir |
| Kapsayıcı | Docker Compose | Tüm servisler tek komutla ayağa kalkar |
| CI/CD | GitHub Actions | Her push'ta otomatik test + deploy |

---

## Özellikler

### Kullanıcı tarafı (Web & Mobil)
- Araç ilanlarını listeleme ve detay görüntüleme
- Fotoğraflara tam ekran / yakınlaştırma ile bakma
- Araç için admin'e mesaj gönderme (gerçek zamanlı)
- Mesaj geçmişini görüntüleme
- Kredi hesaplama modülü

### Admin paneli (Web & Mobil)
- Araç ekleme, düzenleme, silme
- Cloudinary üzerinden fotoğraf yükleme
- Gelen mesajları görüntüleme ve yanıtlama
- Mesaj silme

---

## Proje Fazları

### Faz 1 — Docker
Tüm uygulama servisleri (API, Worker, MySQL, Redis, RabbitMQ) Docker Compose ile tek komutla çalıştırılabilir.

```bash
docker compose up -d --build
```

- API adresi: http://localhost:5000/api/health
- RabbitMQ yönetim paneli: http://localhost:15672 (kullanıcı: `galerio` / şifre: `galerio`)
- Varsayılan admin: `admin@galerio.com` / `admin123456`

Detay: [docs/FAZ1-DOCKER.md](docs/FAZ1-DOCKER.md)

---

### Faz 2 — Redis (Önbellek)
Araç listesi ve araç detayları Redis'te önbelleğe alınır. Bu sayede aynı verilere tekrar tekrar veritabanı sorgusu yapılmaz; sayfa daha hızlı yüklenir.

- Araç eklenince / güncellenince önbellek otomatik temizlenir.
- Redis yoksa uygulama doğrudan veritabanından çalışmaya devam eder (graceful fallback).

Detay: [docs/FAZ2-REDIS.md](docs/FAZ2-REDIS.md)

---

### Faz 3 — RabbitMQ (Mesaj Kuyruğu)
Kullanıcıdan gelen mesajlar önce RabbitMQ kuyruğuna (`galerio.messages`) yazılır. Ayrı bir `worker` servisi kuyruğu dinleyerek mesajları veritabanına kaydeder ve alıcıya Socket.io üzerinden iletir.

- Kuyruk kullanılamıyorsa mesaj doğrudan API tarafında işlenir (yedek akış).
- Worker, Redis pub/sub köprüsü sayesinde API'deki socket bağlantılarına erişir.

Detay: [docs/FAZ3-RABBITMQ.md](docs/FAZ3-RABBITMQ.md)

---

### Faz 4 — CI/CD (Sürekli Entegrasyon & Dağıtım)
Her `git push` ve `pull request` işleminde GitHub Actions otomatik olarak çalışır:

| Adım | Ne yapılır |
|------|------------|
| Server kontrolü | Node.js syntax denetimi (`npm run ci:check`) |
| Web build | React production build (`npm run build`) |
| Mobil lint | ESLint ile kod kalite kontrolü |
| Docker build | `api` ve `worker` imajları derlenir |
| Deploy (CD) | `main` branch'ine push gelince Render otomatik deploy tetiklenir |

Workflow dosyası: [.github/workflows/ci.yml](.github/workflows/ci.yml)

Detay: [docs/FAZ4-CICD.md](docs/FAZ4-CICD.md)

---

## Mobil Uygulama

React Native (Expo) ile geliştirilmiştir. Android ve iOS'u destekler.

| Özellik | Detay |
|---------|-------|
| Framework | Expo ~54 / React Native 0.81 |
| Navigasyon | React Navigation (Stack + Tab) |
| Bildirimler | expo-notifications (push notification) |
| Fotoğraf | expo-image-picker (kamera + galeri) |
| Build | EAS Build (Android APK / iOS IPA) |

Yerel geliştirme için `mobile/.env` dosyasına bilgisayarın IP adresini gir:

```
EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP:5000
```

Detay: [docs/MOBIL-UYGULAMA-YAYIN.md](docs/MOBIL-UYGULAMA-YAYIN.md)

---

## Proje Yapısı

```
galerio-app/
├── mobile/              # React Native (Expo) mobil uygulama
│   ├── src/
│   │   ├── screens/     # Ekranlar (Home, Login, Messages, Admin…)
│   │   ├── components/  # Yeniden kullanılabilir bileşenler
│   │   └── api/         # API ve socket bağlantıları
│   └── eas.json         # EAS Build yapılandırması
│
├── client/              # React web arayüzü
│   └── src/
│       ├── HomePage.js  # Araç listesi (kullanıcı)
│       ├── MessagesPage.js  # Admin mesaj paneli
│       └── ...
│
├── server/              # Node.js API + Worker
│   ├── index.js         # Ana API sunucusu (Express + Socket.io)
│   ├── worker.js        # RabbitMQ kuyruk işleyici
│   └── lib/
│       ├── db.js        # MySQL bağlantı havuzu
│       ├── redis.js     # Redis önbellek
│       ├── rabbitmq.js  # RabbitMQ bağlantısı
│       └── socketBridge.js  # Worker ↔ API köprüsü
│
├── docker/
│   └── mysql/init.sql   # Veritabanı başlangıç şeması
├── docker-compose.yml   # Tüm servisler (MySQL, Redis, RabbitMQ, API, Worker)
├── .github/workflows/
│   └── ci.yml           # GitHub Actions CI/CD pipeline
└── docs/                # Faz dokümantasyonları
```

---

## Rubrik Özeti

| Kriter | Puan | Durum |
|--------|------|-------|
| Mobil FrontEnd | 25 | Expo/React Native — tam ekran uygulama |
| REST API + UI Bağlantısı | 25 | Express API — web & mobil bağlı |
| RabbitMQ / Kafka | 5 | galerio.messages kuyruğu + worker servisi |
| Redis / Memcache | 5 | Araç listesi önbelleği + socket köprüsü |
| Docker | 10 | 5 servis — tek komutla `docker compose up` |
| CI/CD | 5 | GitHub Actions — build + test + deploy |
| Cep Telefonu (Mobil) | 10 | Android APK — EAS Build |
| Demo Gösterimi | 15 | Canlı sunum |
