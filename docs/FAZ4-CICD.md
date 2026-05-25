# Faz 4 — CI/CD (GitHub Actions)

## Ne yapıldı?

Dosya: `.github/workflows/ci.yml`

| Job | Ne kontrol eder |
|-----|------------------|
| **server** | `npm ci` + `npm run ci:check` (syntax) |
| **client** | `npm ci` + `npm run build` |
| **mobile** | `npm ci` + `npm run lint` |
| **docker** | `docker compose build api worker` |
| **ci-success** | Tüm job'ların başarılı olduğunu doğrular |

Tetikleyiciler: `push` ve `pull_request` → `main`, `master`, `develop`

## GitHub'a yükleme

1. GitHub'da boş veya mevcut repo oluşturun.
2. Proje kökünde:

```powershell
cd "c:\Users\Muhammet\Desktop\galerio-app - Kopya"
git add .
git commit -m "feat: Docker, Redis, RabbitMQ ve CI pipeline"
git remote add origin https://github.com/KULLANICI/galerio.git
git push -u origin main
```

3. GitHub → **Actions** sekmesinde yeşil tik görün.

## Badge (isteğe bağlı)

`README.md` üstüne (repo URL'nizi yazın):

```markdown
![CI](https://github.com/KULLANICI/galerio/actions/workflows/ci.yml/badge.svg)
```

## Yerel test (push etmeden)

```powershell
cd server
npm run ci:check

cd ..\client
npm ci
$env:CI="false"; npm run build

cd ..\mobile
npm ci
npm run lint

cd ..
docker compose build api worker
```

## Sorun giderme

**client build fail**  
- `REACT_APP_API_URL` CI'da otomatik `http://localhost:5000` verilir.

**mobile lint fail**  
- `cd mobile && npm run lint` çıktısını düzeltin.

**docker job fail**  
- Docker Desktop açık mı? `docker compose build api worker` yerelde deneyin.

**server npm ci fail**  
- `server` içinde `npm install` → `package-lock.json` commit edin.

## Rubrik

Bu faz **CI/CD (5 puan)** maddesini karşılar. Hocaya: *"Her commit'te otomatik build ve kontrol çalışıyor"* diyebilirsiniz.
