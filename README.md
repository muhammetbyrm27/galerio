# Galerio

Üniversite projesi — araç galerisi, kredi hesaplama, mesajlaşma (mobil + web + API).

## Mimari

| Katman | Teknoloji |
|--------|-----------|
| Mobil | React Native (Expo) |
| Web | React |
| API | Node.js, Express, Socket.io |
| Veritabanı | MySQL |
| Önbellek | Redis |
| Mesaj kuyruğu | RabbitMQ |
| Container | Docker Compose |

## Hızlı başlangıç (Docker)

```bash
docker compose up -d --build
```

- API: http://localhost:5000/api/health  
- RabbitMQ UI: http://localhost:15672 (`galerio` / `galerio`)  
- Admin: `admin@galerio.com` / `admin123456`

Mobil `.env`:

```
EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP:5000
```

## Dokümantasyon

| Faz | Konu | Dosya |
|-----|------|--------|
| 1 | Docker | [docs/FAZ1-DOCKER.md](docs/FAZ1-DOCKER.md) |
| 2 | Redis | [docs/FAZ2-REDIS.md](docs/FAZ2-REDIS.md) |
| 3 | RabbitMQ | [docs/FAZ3-RABBITMQ.md](docs/FAZ3-RABBITMQ.md) |
| 4 | CI/CD | [docs/FAZ4-CICD.md](docs/FAZ4-CICD.md) |

## CI/CD

Her `push` ve `pull_request` (main/master/develop) için GitHub Actions çalışır:

- Server syntax kontrolü
- Web production build
- Mobil ESLint
- Docker imaj derlemesi (api + worker)

Workflow: [.github/workflows/ci.yml](.github/workflows/ci.yml)

Yerelde server kontrolü:

```bash
cd server && npm run ci:check
```

## Proje yapısı

```
├── mobile/          # Expo uygulaması
├── client/          # React web
├── server/          # API + worker
├── docker/          # MySQL init SQL
├── docker-compose.yml
└── .github/workflows/
```

## Rubrik özeti

- Mobil FrontEnd + REST API bağlantısı  
- Docker, Redis, RabbitMQ, CI/CD  
- Demo: telefon + Docker + kuyruk paneli  
