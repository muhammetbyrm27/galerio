# Canlı ortam (web ile aynı mimari)

| Bileşen | Platform | URL |
|---------|----------|-----|
| **API** | Render | https://galerio-xsmd.onrender.com |
| **Web** | Vercel | (Vercel proje URL’niz) |
| **Mobil** | Expo | API = Render URL |

## 1. GitHub’a gönder (otomatik deploy tetikler)

```powershell
cd "c:\Users\Muhammet\Desktop\galerio-app - Kopya"
git add .
git commit -m "feat: mobil, Docker, Redis, RabbitMQ, CI ve Render start script"
git push origin main
```

Render ve Vercel, bağlı repoda **auto-deploy** açıksa birkaç dakika içinde güncellenir.

## 2. Render (API) kontrol

Dashboard → servis → **Environment**:

| Değişken | Zorunlu |
|----------|---------|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Evet |
| `JWT_SECRET` | Evet |
| `DB_SSL` | `true` (Render MySQL) |
| `CLIENT_URL` | `*` veya Vercel domain |
| `REDIS_URL` | Hayır (yoksa cache kapalı) |
| `RABBITMQ_URL` | Hayır (yoksa mesaj API içinde işlenir) |

**Build & Deploy:**

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start` veya `node index.js`

Deploy sonrası: https://galerio-xsmd.onrender.com/api/health

## 3. Vercel (web)

Repo bağlıysa push yeterli. Environment:

```
REACT_APP_API_URL=https://galerio-xsmd.onrender.com
```

## 4. Mobil — canlı API (web gibi)

`mobile/.env` (Expo Go ile canlı test):

```
EXPO_PUBLIC_API_URL=https://galerio-xsmd.onrender.com
```

Expo’yu yeniden başlatın: `npx expo start --lan`

> Yerel Docker API için: `http://192.168.x.x:5000`

## 5. Sorun giderme

| Belirti | Çözüm |
|---------|--------|
| Render build fail | Logs → `npm install` / `package-lock.json` commit edildi mi |
| 503 health | DB env değişkenleri, `DB_SSL=true` |
| Web mesaj gitmiyor | `REACT_APP_API_URL` Render’a işaret etmeli |
| Mobil network error | `.env` Render URL, HTTPS |
