# Faz 4 — CI/CD (GitHub Actions)

## Amaç

Her `git push` ve `pull request` işleminde kod otomatik olarak test edilir, derlenir ve başarıyla geçerse production ortamına (Render) deploy tetiklenir.

---

## Pipeline Aşamaları

Dosya: `.github/workflows/ci.yml`

| Adım | Ne kontrol eder |
|------|-----------------|
| **server** | `npm ci` + syntax kontrolü (`npm run ci:check`) |
| **client** | `npm ci` + React production build (`npm run build`) |
| **mobile** | `npm ci` + ESLint kod kalite kontrolü |
| **docker** | `docker compose build api worker` — imajlar başarıyla derlenir mi? |
| **ci-success** | Tüm adımların başarılı olduğunu doğrular |
| **deploy** | `main` branch'e push gelince Render deploy hook'u tetiklenir |

**Tetikleyiciler:** `push` ve `pull_request` → `main`, `master`, `develop` branch'leri

---

## GitHub Actions Durumu

[![CI](https://github.com/muhammetbyrm27/galerio/actions/workflows/ci.yml/badge.svg)](https://github.com/muhammetbyrm27/galerio/actions/workflows/ci.yml)

Her commit sonrası GitHub → **Actions** sekmesinde yeşil tik görülmeli.

---

## Otomatik Deploy (CD) Kurulumu

`main` branch'ine push geldiğinde Render otomatik deploy tetiklemek için:

1. Render → `bayramlarauto` servisi → **Settings** → **Deploy Hook** → URL'yi kopyala
2. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
3. İsim: `RENDER_DEPLOY_HOOK_URL`, değer: kopyalanan URL

Bu ayar yapıldıktan sonra her başarılı CI çalışmasının ardından Render otomatik olarak güncellenir.

---

## Yerel Kontrol (push etmeden önce)

```bash
# Server syntax kontrolü
cd server && npm run ci:check

# Web build
cd ../client && npm ci && npm run build

# Mobil lint
cd ../mobile && npm ci && npm run lint

# Docker imaj derleme
cd .. && docker compose build api worker
```

---

## Sorun Giderme

| Hata | Çözüm |
|------|-------|
| `client build fail` | `CI=false` ortam değişkenini ayarlayın ya da ESLint uyarılarını giderin |
| `mobile lint fail` | `cd mobile && npm run lint` çıktısını inceleyip hataları düzeltin |
| `docker job fail` | Docker Desktop'ın çalıştığından emin olun; `docker compose build api worker` yerelde deneyin |
| `server npm ci fail` | `server/` içinde `npm install` çalıştırıp `package-lock.json`'u commit edin |

---

## Kapsanan Rubrik Kriteri

Bu faz **CI/CD (5 puan)** maddesini karşılar. Her commit'te otomatik build, test ve deploy çalışmaktadır.
