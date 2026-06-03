@echo off
cd /d "%~dp0"
echo Copying from call-center-panel...
node scripts\copy-from-source.mjs
echo Starting Docker...
docker compose up -d
timeout /t 8 /nobreak >nul
echo npm install...
call npm install
echo Prisma migrate...
call npx prisma migrate deploy
if errorlevel 1 call npx prisma db push
echo Starting dev server on port 3000...
start "personelpanel2-dev" cmd /c "npm run dev"
echo.
echo Panel: http://localhost:3000
echo Login: admin@local.test / Admin123!
pause
