# Faz 1 — Docker Kurulumu

## Gereksinimler

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu ve çalışıyor olmalı

## Çalıştırma

### 1. Container'ları derleyin ve başlatın

```bash
docker compose up -d --build
```

İlk çalıştırmada MySQL şeması `docker/mysql/init.sql` ile otomatik oluşturulur (1–2 dakika sürebilir).

### 2. Durumu kontrol edin

```bash
docker compose ps
docker compose logs api --tail 30
```

API hazır olduğunda aşağıdaki endpoint'e istek atın:

```
GET http://localhost:5000/api/health
```

Beklenen yanıt: `{"status":"ok","database":"connected",...}`

### 3. Mobil uygulamayı Docker API'sine bağlayın

`mobile/.env` dosyasına bilgisayarın yerel IP adresini girin:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000
```

- Android Emülatör: `http://10.0.2.2:5000`
- Gerçek cihaz (aynı Wi-Fi ağında): `ipconfig` komutuyla IP'nizi öğrenin

Expo'yu yeniden başlatın: `npx expo start --lan`

### 4. Varsayılan giriş hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@galerio.com | admin123456 |

Kullanıcı kaydı mobil veya web arayüzünden yapılabilir.

---

## Servisler

| Servis | Adres |
|--------|-------|
| API | http://localhost:5000 |
| MySQL | localhost:3307 |
| Redis | localhost:6379 |
| RabbitMQ Yönetim Paneli | http://localhost:15672 (kullanıcı: `galerio` / şifre: `galerio`) |

---

## Sık kullanılan komutlar

```bash
# Durdur
docker compose down

# Durdur ve veritabanını sıfırla
docker compose down -v

# Yalnızca API loglarını izle
docker compose logs -f api

# Yalnızca API container'ını yeniden derle
docker compose up -d --build api
```

---

## Sorun giderme

**API `database: disconnected` dönüyorsa**
- `docker compose logs mysql` ile MySQL'in sağlıklı (healthy) olup olmadığını kontrol edin
- `docker compose restart api` komutunu çalıştırın

**Port çakışması (3306 veya 5000 kullanımda)**
- Yerel MySQL veya Node.js servislerini durdurun ya da `docker-compose.yml` içindeki port değerlerini değiştirin

**Mobil cihaz API'ye ulaşamıyorsa**
- Güvenlik duvarında 5000 portuna izin verin
- Telefon ve bilgisayar aynı Wi-Fi ağında olmalı

---

## Kapsanan Rubrik Kriteri

Bu faz **Docker (10 puan)** maddesini karşılar. Redis ve RabbitMQ container'ları Faz 2 ve Faz 3 için hazır hâlde bu compose dosyasına dahildir.
