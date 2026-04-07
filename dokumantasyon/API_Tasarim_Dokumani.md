# Oto Galeri Yönetim Sistemi - REST API Tasarım Dökümanı

Projeye ait RESTful API uç noktaları HTTP metodlarına göre organize edilmiştir. Tüm API yanıtları JSON formatında dönmektedir.

## 1. Authentication (Kimlik Doğrulama) & Kullanıcı İşlemleri

### `POST /api/register`
*   **Açıklama:** Yeni bir "user" rolünde kullanıcı kaydı oluşturur.
*   **Body (JSON):** `name`, `email`, `password` (min 6 karakter)
*   **Dönüş:** `{ "message": "Kayıt başarılı..." }` (201 Created) / 400 Bad Request

### `POST /api/login`
*   **Açıklama:** Email ve şifreye göre JWT (JSON Web Token) döner.
*   **Body (JSON):** `email`, `password`
*   **Dönüş:** `{ "token": "JWT_TOKEN_BURAYA" }` (200 OK) / 401 Unauthorized

### `POST /api/request-password-reset`
*   **Açıklama:** E-posta hesabına SendGrid üzerinden güvenlik şifresi yollar.
*   **Body (JSON):** `email`
*   **Dönüş:** 200 OK veya 404 Not Found.

## 2. Araç (Vehicle) İşlemleri

### `GET /api/vehicles`
*   **Açıklama:** Veritabanındaki tüm araçları, ana fotoğraf URL'i ile birlikte liste halinde döner.
*   **Yetki:** Herkese açık.

### `GET /api/vehicles/:id`
*   **Açıklama:** İlgili araca ait tüm detayları ve ilişkili tüm fotoları (array) döner.

### `POST /api/vehicles`
*   **Açıklama:** YENİ ARAÇ EKLER. Çoklu parça form verisi ile "photos" isminde 10 adede kadar resim destekler.
*   **Yetfile:** `Bearer {token}` gerekli (Sadece Admin).
*   **Body (FormData):** `brand`, `model`, `year`, `color`, `gear`, `fuel`, `purchase_price`, `sale_price` vb.
*   **Dönüş:** Yeni oluşturulan araç id'si ve başarı mesajı. (201 Created)

### `DELETE /api/vehicles/:id`
*   **Açıklama:** Aracı, araca ait fotoğrafları (diskteki .jpg dosyaları dahil) ve sadece bu araca dair sohbetleri veritabanından kalıcı olarak siler.
*   **Yetki:** Admin.

## 3. Personel İşlemleri

### `GET /api/personnel`
*   **Açıklama:** Tüm personel bilgisini listeler.
*   **Yetki:** Sadece Admin

### `POST /api/personnel`
*   **Açıklama:** Sisteme yeni personel ekler, TC Kimlik No doğruluğunu kontrol eder.

## 4. Mesajlaşma (Sohbet) İşlemleri

*Not: Mesaj içeriği WebSocket üzerinden iletilse de, sohbetlerin silinmesi veya geçmişinin alınması için REST API kullanılır.*

### `GET /api/user-conversations`
*   **Açıklama:** Sadece giriş yapmış kullanıcının (`user` rolü) geçmiş sohbet bağlantılarını getirir.
*   **Yetki:** User (Token Gerekli).

### `DELETE /api/user/conversations/:conversationId`
*   **Açıklama:** Kullanıcının spesifik bir adminle başlattığı sohbet odasını veritabanından tamamen siler, canlı kanala (Socket) 'conversation_deleted' event'i yollar.

## 5. Kredi Hesaplama (Ek İşlem Modülü)

### `POST /api/kredi/hesapla`
*   **Açıklama:** Tutar, vade ve faiz oranı alıp ay ay geri ödeme planı çıkarır.
*   **Yetki:** Herkese açık.
*   **Body:** `krediTutari`, `vade`, `aylikFaizOrani`
*   **Dönüş (200 OK):** Her taksit için { tarih, taksitTutari, anapara, faiz, bsmv, kkdf } değerlerini barındıran Array.
