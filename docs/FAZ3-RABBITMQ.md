# Faz 3 — RabbitMQ mesaj kuyruğu

## Akış

1. Mobil/web `send_message` (Socket.io) → **API**
2. API mesajı **RabbitMQ** kuyruğuna yazar (`galerio.messages`)
3. **Worker** kuyruktan okur → MySQL’e kaydeder
4. Worker sonucu **Redis pub/sub** ile API’ye iletir
5. API **Socket.io** ile `receive_message` yayınlar

## Docker

```powershell
cd "c:\Users\Muhammet\Desktop\galerio-app - Kopya"
docker compose up -d --build
```

Servisler: `api`, `worker`, `mysql`, `redis`, `rabbitmq`

## Kontrol

```powershell
(Invoke-WebRequest http://localhost:5000/api/health -UseBasicParsing).Content
```

Beklenen: `"rabbitmq":"connected"`, `"queue":"galerio.messages"`

RabbitMQ yönetim paneli: http://localhost:15672 — `galerio` / `galerio`

## Demo (hocaya anlatım)

1. Panelde `galerio.messages` kuyruğunu göster
2. Kullanıcıdan mesaj gönder → kuyrukta kısa süre mesaj görünür
3. Worker log: `📥 Kuyruktan mesaj alındı`
4. Admin/kullanıcı mesajı anlık alır

Worker’ı durdurma testi:

```powershell
docker compose stop worker
# mesaj kuyrukta birikir
docker compose start worker
# mesajlar işlenir
```

## Loglar

```powershell
docker compose logs -f api
docker compose logs -f worker
```
