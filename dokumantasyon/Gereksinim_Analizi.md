# Oto Galeri Yönetim Sistemi - Gereksinim Analizi Raporu

## 1. Projenin Amacı
Bu projenin temel amacı, oto galerilerin araç alım-satım, personel takibi ve müşteri iletişimi gibi süreçlerini dijitalleştiren kapsamlı bir yönetim platformu geliştirmektir. Müşteriler araçları inceleyebilir, kredi hesaplamaları yapabilir ve yetkililerle canlı sohbet edebilirken; galerici (admin) ise araç envanterini ve personeli yönetebilmektedir.

## 2. Kullanıcı Rolleri ve Yetkileri

### 2.1. Normal Kullanıcı (User)
Normal kullanıcılar sisteme üye olabilir, giriş yapabilir, şifrelerini unuttuklarında sıfırlama talebinde bulunabilir.
Sistemde yapabilecekleri:
- Mevcut satılık araç listesini görüntüleyebilme.
- Araç detaylarına inip fotoğraf galerisini (thumbnail desteği) inceleyebilme.
- Kredi hesaplama modülü sayesinde belirli faiz oranı ve vadeyle ödeme planı çıkartabilme (KKDF, BSMV hesaplamalarıyla birlikte).
- Sistemdeki galerici/admin ile gerçek zamanlı (Socket.IO) sohbet başlatabilme ve bu görüşmeleri arşivleyebilme.

### 2.2. Sistem Yöneticisi (Admin)
Oto galeriyi yöneten asıl personeldir. Normal kullanıcıların gördüğü her şeye ek olarak, yönetim paneline ("Dashboard") erişebilir.
Sistemde yapabilecekleri:
- **Araç Yönetimi:** Sisteme çoklu fotoğraf yükleyerek araç (marka, model, yıl, fiyat vb.) eklemek, düzenlemek ve silmek.
- **Personel Yönetimi:** Galeri çalışanlarının (maaş, pozisyon vb.) kayıtlarını girmek ve düzenlemek.
- **Müşteri İletişimi Yönetimi:** Gelen kullanıcı mesajlarını okumak, anlık cevap vermek ve sohbeti sonlandırmak / silmek.

## 3. Fonksiyonel Gereksinimler
- **Kimlik Doğrulama:** JWT token yapısı ile kullanıcı oturumları güvence altına alınmalıdır.
- **Şifre Sıfırlama:** SendGrid entegrasyonu ile mail atılarak rastgele 6 haneli güvenlik kodu ile şifre değişimi yapılmalıdır.
- **Dosya Yükleme:** Araçlara birden fazla resim yüklenebilmeli (multer modülü), sunucuda güvenle barındırılmalıdır.
- **Canlı Sistem:** Okunmamış mesaj sayıları menüye yansımalı, mesajlaşmalar iki taraf arasında sayfa yenilemeden gerçekleşmelidir.
- **Otomatik Temizlik:** Sunucuda çalışan 'cron job' sayesinde, 3 günden eski mesaj geçmişi otomatik temizlenerek veritabanı yükü düşürülmelidir.

## 4. Sistem Gereksinimleri
- **Frontend:** React.js, React-Router (SPA mimarisi).
- **Backend:** Node.js, Express.js (REST API mimarisi).
- **Gerçek Zamanlı İletişim:** Socket.IO kütüphanesi.
- **Veritabanı:** MySQL (Tablolar: users, vehicles, vehicle_photos, personnel, messages).
