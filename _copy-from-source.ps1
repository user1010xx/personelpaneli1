$src = "C:\Users\user1\call-center-panel"
$dest = "C:\projeler\personelpanel2.py"
$preserve = @('.env', 'docker-compose.yml', 'BASLAT.ps1')
$backup = @{}
foreach ($f in $preserve) {
  $p = Join-Path $dest $f
  if (Test-Path $p) { $backup[$f] = [IO.File]::ReadAllText($p) }
}
$destPkg = Join-Path $dest 'package.json'
$destObj = if (Test-Path $destPkg) { Get-Content $destPkg -Raw | ConvertFrom-Json } else { $null }
robocopy $src $dest /E /XD node_modules .next .git /NFL /NDL /NJH /NJS
foreach ($k in $backup.Keys) { [IO.File]::WriteAllText((Join-Path $dest $k), $backup[$k]) }
$merged = Get-Content (Join-Path $src 'package.json') -Raw | ConvertFrom-Json
if ($destObj) {
  $merged.name = $destObj.name
  if ($destObj.scripts.dev) { $merged.scripts | Add-Member -NotePropertyName dev -NotePropertyValue $destObj.scripts.dev -Force }
}
($merged | ConvertTo-Json -Depth 50) | Set-Content $destPkg -Encoding utf8
$count = (Get-ChildItem -Path $dest -Recurse -File | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.next\\' }).Count
Write-Output "FILE_COUNT=$count"
