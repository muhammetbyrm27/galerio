# Faz 1 — Docker kurulumu

## Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows)

## Adım adım çalıştırma

### 1. Proje köküne geçin

```powershell
cd "c:\Users\Muhammet\Desktop\galerio-app - Kopya"
```

### 2. Container’ları derleyin ve başlatın

```powershell
docker compose up -d --build
```

İlk seferde MySQL şeması `docker/mysql/init.sql` ile oluşur (1–2 dk sürebilir).

### 3. Durumu kontrol edin

```powershell
docker compose ps
docker compose logs api --tail 30
```

API hazır olduğunda:

```powershell
curl http://localhost:5000/api/health
```

Beklenen: `{"status":"ok","database":"connected",...}`

### 4. Mobil uygulamayı bağlayın

`mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP:5000
```

- Emülatör Android: `http://10.0.2.2:5000`
- Gerçek telefon (aynı Wi‑Fi): `http://192.168.x.x:5000` (`ipconfig` ile IP)

Expo’yu yeniden başlatın: `npx expo start --lan`

### 5. Giriş hesapları (Docker seed)

| Rol   | E-posta              | Şifre        |
|-------|----------------------|--------------|
| Admin | admin@galerio.com    | admin123456  |

Kullanıcı: mobil uygulamadan **Kayıt ol** ile oluşturulur.

## Servisler

| Servis    | Adres                         |
|-----------|-------------------------------|
| API       | http://localhost:5000         |
| MySQL     | localhost:3306                |
| Redis     | localhost:6379 (Faz 2)        |
| RabbitMQ  | http://localhost:15672 (Faz 3) — kullanıcı: `galerio` / `galerio` |

## Sık kullanılan komutlar

```powershell
# Durdur
docker compose down

# Durdur + veritabanı sil (sıfırdan kurulum)
docker compose down -v

# Sadece API logları
docker compose logs -f api
```

## Sorun giderme

**API `database: disconnected`**
- `docker compose logs mysql` — MySQL healthy mi?
- `docker compose restart api`

**Port 3306 veya 5000 dolu**
- Yerel MySQL/Node kapatın veya `docker-compose.yml` portlarını değiştirin.

**Mobil API’ye ulaşamıyor**
- Windows güvenlik duvarında 5000 portuna izin verin.
- Telefon ve PC aynı ağda olmalı.

## Rubrik

Bu faz **Docker (10 puan)** maddesini karşılar. Redis ve RabbitMQ container’ları Faz 2–3 için hazırdır.
