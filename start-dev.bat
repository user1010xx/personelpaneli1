@echo off
cd /d "%~dp0"
echo Proje: %CD%
echo.

if not exist package.json (
  echo HATA: package.json bulunamadi.
  pause
  exit /b 1
)

if not exist node_modules (
  echo npm install calistiriliyor...
  call npm install
  if errorlevel 1 pause & exit /b 1
)

if not exist .env (
  echo .env yok, .env.example kopyalaniyor...
  copy .env.example .env
  echo Lutfen .env dosyasini duzenleyin ve tekrar calistirin.
  pause
  exit /b 1
)

echo PostgreSQL (Docker) kontrol...
docker compose up -d 2>nul
if errorlevel 1 echo UYARI: Docker yok veya postgres baslatilamadi - mevcut PostgreSQL kullanilacak.

echo Veritabani migration...
call npx prisma migrate deploy
if errorlevel 1 (
  echo UYARI: Migration basarisiz - PostgreSQL calisiyor mu? Port 5433?
  echo Devam ediliyor...
)

echo.
echo Sunucu baslatiliyor: http://localhost:3000
echo Durdurmak icin Ctrl+C
echo.
start "" "http://localhost:3000"
call npx next dev -p 3000
