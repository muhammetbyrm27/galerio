# Galerio — Mobil uygulama mağaza yayını

Expo Go yerine **bağımsız APK/AAB (Android)** ve **IPA (iOS)** üretmek için [EAS Build](https://docs.expo.dev/build/introduction/) kullanılır.

## Ücretsiz / düşük maliyet seçenekler

| Yöntem | Maliyet | Kimler indirir |
|--------|---------|----------------|
| **EAS Preview APK** | Expo ücretsiz kotası (ayda sınırlı build) | Linke tıklayıp APK yükler (Play Store dışı) |
| **Google Play** | Tek sefer ~25 USD geliştirici hesabı | Herkes Play Store’dan |
| **iOS App Store** | Yıllık ~99 USD Apple Developer | iPhone kullanıcıları |
| **TestFlight (iOS)** | Apple Developer ile | Beta testçiler |

En hızlı yol: **Preview APK** — Play Store hesabı gerekmez.

---

## 1. Hazırlık (bir kez)

### Expo hesabı
```bash
npm install -g eas-cli
eas login
cd mobile
eas init
```
`eas init` proje ID’sini `app.json` içine yazar.

### Canlı API adresi
`mobile/eas.json` içinde `EXPO_PUBLIC_API_URL` zaten Render adresinize ayarlı. Değiştirirseniz yeniden build alın.

### Cloudinary (fotoğraflar kalıcı olsun)
1. https://cloudinary.com — ücretsiz hesap
2. Dashboard → **API Keys**
3. Render → Environment:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Deploy sonrası yeni yüklenen fotoğraflar Cloudinary’de kalır (deploy ile silinmez)

---

## 2. Ücretsiz APK (Android, mağaza dışı)

```bash
cd mobile
eas build --platform android --profile preview
```

Build bitince Expo sayfasında **APK indirme linki** çıkar. Linki paylaşın; kullanıcılar “Bilinmeyen kaynaklara izin ver” ile kurar.

---

## 3. Google Play Store

1. https://play.google.com/console — geliştirici hesabı (~25 USD)
2. Production build:
   ```bash
   cd mobile
   eas build --platform android --profile production
   ```
3. Çıkan **AAB** dosyasını Play Console’a yükleyin
4. Mağaza listesi (ekran görüntüsü, açıklama, gizlilik politikası URL)

```bash
eas submit --platform android --profile production
```
(İlk seferde Play Console API / service account bağlantısı gerekir.)

---

## 4. iOS App Store

1. https://developer.apple.com — Apple Developer Program (~99 USD/yıl)
2. ```bash
   eas build --platform ios --profile production
   ```
3. ```bash
   eas submit --platform ios --profile production
   ```

---

## 5. Proje komutları

`mobile/package.json`:

| Komut | Açıklama |
|-------|----------|
| `npm run build:apk` | Ücretsiz test APK (preview) |
| `npm run build:android` | Play Store AAB (production) |
| `npm run build:ios` | App Store IPA (production) |

---

## 6. Expo Go vs gerçek uygulama

| | Expo Go | EAS Build APK/IPA |
|--|---------|-------------------|
| Kurulum | Expo Go uygulaması + QR | Tek başına Galerio ikonu |
| Mağaza | Hayır | Evet (Play / App Store) |
| Bildirimler | Kısıtlı | Tam destek |
| API | `.env` build sırasında gömülür | Aynı |

---

## Sorun giderme

- **Build hata veriyor:** `eas build:run` loglarına bakın veya `eas build --local` (Android SDK gerekir)
- **API’ye bağlanmıyor:** `EXPO_PUBLIC_API_URL` https ile Render adresi olmalı; http localhost production build’de çalışmaz
- **Fotoğraf yok:** Render’da Cloudinary env değişkenlerini kontrol edin; araç fotoğraflarını yeniden yükleyin
