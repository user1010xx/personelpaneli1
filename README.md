# Çağrı Merkezi Operasyon Paneli

Çağrı merkezi verilerini tek panelde toplayan, Google Sheets ve Excel entegrasyonlu, Railway üzerinde deploy edilebilir web uygulaması.

## Özellikler

- **Dashboard**: Tarih aralığına göre personel performans tablosu ve 3’lü lider kartları (üyelik, çağrı puanı, konuşma süresi, arama, WhatsApp cevapsız). Kaynaklar: Üye Adedi, Çağrı Süreci, Kalite, WhatsApp, Personel listesi.
- **Google Sheets** (yalnızca admin sync): Personel, Puantaj, WhatsApp, Uyarı Kesinti — her sync modülün güncel snapshot’ını yansıtır.
- **Excel yükleme** (yalnızca admin): Üye Adedi, Çağrı Süreci
- **Manuel kayıt**: Kalite Puanlaması, Eğitim Geribildirim (kayıt sahibi veya admin düzenler)
- **Filtreler**: Arama, tarih, sıralama; oturum boyunca filtre hatırlama
- **Excel export**: Tüm modüllerde (üst limit 10.000 satır)
- **Roller**: `ADMIN` (kullanıcı, sheet URL, sync/upload), `USER` (okuma + manuel kayıt)

> Dashboard’da puantaj, uyarı kesinti ve eğitim metrikleri henüz yok — bilinçli kapsam dışı.

## Railway Deploy

1. GitHub’a push
2. Railway → Deploy from repo → PostgreSQL ekle
3. `.env.example` değişkenlerini girin (`JWT_SECRET` güçlü olmalı)
4. `npm run start` → `prisma migrate deploy` + `next start`
5. İlk giriş: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (yalnızca ilk kullanıcı oluşturma)
6. Admin → Kullanıcı Yönetimi → Google Sheets URL’leri

## Sağlık kontrolü

`GET /api/health` — kimlik doğrulama gerekmez (load balancer için).

## Geliştirme

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

## Test

```bash
npm test
npm run lint
npx tsc --noEmit
```

## Güvenlik notları

- Oturum: 1 gün, httpOnly cookie
- Login: rate limit (10 deneme / 15 dk)
- API: pasif kullanıcılar reddedilir
- Sync/upload: admin only
