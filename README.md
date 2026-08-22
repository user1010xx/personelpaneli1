# Çağrı Merkezi Operasyon Paneli

Çağrı merkezi kalite, eğitim ve insiyatif kayıtlarını tek panelde toplayan, Railway üzerinde deploy edilebilir web uygulaması.

## Özellikler

- **Dashboard**: Personel bazında dinlenen çağrı, ortalama puan, insiyatif, geribildirim ve eğitim adetleri.
- **Manuel kayıt**: Eğitim Geribildirim, Çağrı Geribildirim, Çağrı Denetleme, İnsiyatif Çalışma. Geribildirim kayıtları silinmez.
- **Filtreler**: Arama, tarih, sıralama; oturum boyunca filtre hatırlama
- **Excel export**: Dashboard ve manuel modüller (üst limit 10.000 satır)
- **Roller**: `ADMIN` (kullanıcı yönetimi, log), `USER` (okuma + manuel kayıt)

## Railway Deploy

1. GitHub’a push
2. Railway → Deploy from repo → PostgreSQL ekle
3. `.env.example` değişkenlerini girin (`JWT_SECRET` güçlü olmalı)
4. `npm run start` → `prisma migrate deploy` + `next start`
5. İlk giriş: `ADMIN_EMAIL` / `ADMIN_PASSWORD`

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
