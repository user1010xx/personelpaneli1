# Personel Panel 2 - Yerel baslatma
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$src = "C:\Users\user1\call-center-panel"
if (-not (Test-Path "$src\package.json")) {
  $src = "C:\Users\user1\.cursor\projects\empty-window\call-center-panel"
}

if ((Test-Path "$PSScriptRoot\scripts\copy-from-source.mjs")) {
  Write-Host "Kaynak kopyalaniyor..."
  node "$PSScriptRoot\scripts\copy-from-source.mjs"
}

Write-Host "PostgreSQL (Docker) baslatiliyor..."
docker compose up -d 2>$null
Start-Sleep -Seconds 5

Write-Host "npm install..."
npm install

Write-Host "Veritabani hazirlaniyor..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { npx prisma db push }

Write-Host ""
Write-Host "Panel: http://localhost:3000"
Write-Host "Giris: admin@local.test / Admin123!"
Write-Host ""

npm run dev
