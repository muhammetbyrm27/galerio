# Faz 3 — RabbitMQ Mesaj Kuyruğu

## Amaç

Kullanıcıdan gelen mesajlar doğrudan veritabanına yazılmak yerine önce bir kuyruğa alınır. Ayrı bir `worker` servisi bu kuyruğu dinleyerek mesajları işler. Bu mimari, yüksek trafikte sistemin kararlı kalmasını ve mesajların kaybolmamasını sağlar.

---

## Mesaj Akışı

```
Kullanıcı / Admin
      |
      | Socket.io (send_message)
      ▼
  API Sunucusu
      |
      | publishMessage()
      ▼
RabbitMQ Kuyruğu (galerio.messages)
      |
      | consumeMessages()
      ▼
   Worker Servisi
      |
      | MySQL'e kaydet
      | Redis pub/sub
      ▼
  API Sunucusu → Socket.io (receive_message) → Alıcı
```

1. Kullanıcı veya admin mesaj gönderir (Socket.io `send_message`)
2. API, mesajı RabbitMQ kuyruğuna yazar (`galerio.messages`)
3. Worker servisi kuyruğu dinler, mesajı MySQL'e kaydeder
4. Worker, sonucu Redis pub/sub üzerinden API'ye iletir
5. API, Socket.io ile alıcıya `receive_message` eventi gönderir

> **Not:** RabbitMQ erişilemezse mesaj doğrudan API tarafında işlenir (yedek akış — sistemin çökmemesi için).

---

## Docker ile çalıştırma

```bash
docker compose up -d --build
```

5 servis birlikte ayağa kalkar: `api`, `worker`, `mysql`, `redis`, `rabbitmq`

---

## Kontrol

```powershell
(Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing).Content
```

Beklenen: `"rabbitmq":"connected"`, `"queue":"galerio.messages"`

**RabbitMQ Yönetim Paneli:** http://localhost:15672  
Kullanıcı: `galerio` / Şifre: `galerio`

---

## Demo Adımları

1. http://localhost:15672 adresinde `galerio.messages` kuyruğunu göster
2. Web veya mobil uygulamadan bir mesaj gönder → kuyrukta kısa süreliğine mesaj görünür
3. Worker logunda `📥 Kuyruktan mesaj alındı` satırını göster
4. Admin veya kullanıcı mesajı anlık olarak alır

**Worker durdurma testi (kuyruğun biriktiğini göstermek için):**

```bash
docker compose stop worker
# Mesajlar gönder → kuyrukta birikir (yönetim panelinde görünür)
docker compose start worker
# Worker başlar, biriken mesajları işler
```

**Logları izle:**

```bash
docker compose logs -f api
docker compose logs -f worker
```

---

## Kapsanan Rubrik Kriteri

Bu faz **RabbitMQ / Kafka (5 puan)** maddesini karşılar.
