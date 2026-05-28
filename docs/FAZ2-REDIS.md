# Faz 2 — Redis Önbellek (Cache)

## Amaç

Araç listesi ve araç detay sayfaları her istekte veritabanına sorgu atmak yerine Redis önbelleğinden sunulur. Bu sayede sayfa yükleme süresi önemli ölçüde azalır.

## Nasıl çalışır?

| İşlem | Açıklama |
|-------|----------|
| `GET /api/vehicles` | Araç listesi 60 saniye Redis'te tutulur (`galerio:vehicles:list`) |
| `GET /api/vehicles/:id` | Araç detayı önbelleklenir |
| Araç ekle / güncelle / sil | İlgili önbellek otomatik temizlenir |
| `GET /api/health` | `"redis": "connected"` durumu gösterir |

Yanıt başlığında `X-Cache` değeri döner: `HIT` (önbellekten), `MISS` (ilk istek), `BYPASS` (Redis kapalı).

---

## Docker ile çalıştırma

Redis, `docker-compose.yml` içinde ayrı bir servis olarak tanımlanmıştır. Tüm sistemi başlatmak için:

```bash
docker compose up -d --build
```

---

## Cache'in çalıştığını doğrulama

**Windows (PowerShell):**
```powershell
# 1. istek — X-Cache: MISS
Invoke-WebRequest http://localhost:5000/api/vehicles -UseBasicParsing | Select-Object -ExpandProperty Headers

# 2. istek (60 saniye içinde) — X-Cache: HIT
Invoke-WebRequest http://localhost:5000/api/vehicles -UseBasicParsing | Select-Object -ExpandProperty Headers
```

**Health endpoint:**
```powershell
(Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing).Content
```

Beklenen çıktı: `"redis":"connected"`

---

## Yerel geliştirme (Docker olmadan)

`server/.env` dosyasına Redis bağlantı adresini ekleyin:

```env
REDIS_URL=redis://127.0.0.1:6379
```

Redis çalışmıyorsa uygulama doğrudan veritabanından çalışmaya devam eder (`X-Cache: BYPASS`). Redis yokluğunda sistemin çökmemesi için "graceful fallback" mekanizması uygulanmıştır.

---

## Kapsanan Rubrik Kriteri

Bu faz **Redis / Memcache (5 puan)** maddesini karşılar.
