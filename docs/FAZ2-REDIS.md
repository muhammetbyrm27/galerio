# Faz 2 — Redis önbellek

## Ne yapıldı?

- `GET /api/vehicles` → liste 60 sn Redis'te (`galerio:vehicles:list`)
- `GET /api/vehicles/:id` → detay önbelleği
- Araç ekle/güncelle/sil/fotoğraf → önbellek temizlenir
- `GET /api/health` → `"redis": "connected"`
- Yanıt başlığı `X-Cache`: `HIT` | `MISS` | `BYPASS`

## Docker ile güncelleme

```powershell
cd "c:\Users\Muhammet\Desktop\galerio-app - Kopya"
docker compose up -d --build api
```

## Cache testi

```powershell
# 1. istek — MISS (veya boş liste)
Invoke-WebRequest http://localhost:5000/api/vehicles -UseBasicParsing | Select Headers

# 2. istek (60 sn içinde) — X-Cache: HIT
Invoke-WebRequest http://localhost:5000/api/vehicles -UseBasicParsing | Select Headers
```

Health:

```powershell
(Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing).Content
```

Beklenen: `"redis":"connected"`

## Yerel (Docker olmadan)

`server/.env`:

```
REDIS_URL=redis://127.0.0.1:6379
```

Redis çalışmıyorsa API MySQL ile devam eder (`X-Cache: BYPASS`).
