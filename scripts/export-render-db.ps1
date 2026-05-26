# Render galerio-xsmd MySQL veritabanini disa aktarir (Aiven'e import icin)
# ONEMLI: Host = xsmd Environment DB_HOST (Aiven host DEGIL)

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
if (-not (Test-Path $mysql)) {
  Write-Host "mysqldump bulunamadi." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Render -> galerio-xsmd -> Environment -> DB_*" -ForegroundColor Cyan
Write-Host "(Aiven host ile export YAPMAYIN; dump bos kalir)" -ForegroundColor Yellow
Write-Host ""

$hostName = Read-Host "DB_HOST"
$port = Read-Host "DB_PORT [3306]"
if ([string]::IsNullOrWhiteSpace($port)) { $port = "3306" }
$user = Read-Host "DB_USER"
$dbName = Read-Host "DB_NAME"
$out = Read-Host "Cikti dosyasi [xsmd-canli.sql]"
if ([string]::IsNullOrWhiteSpace($out)) { $out = "xsmd-canli.sql" }

$pwd = Read-Host "DB_PASSWORD" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd)
$env:MYSQL_PWD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$ssl = Read-Host "SSL gerekli mi? [E/h]"
if ($ssl -eq "h") {
  $sslArgs = @()
} else {
  $sslArgs = @("--ssl-mode=REQUIRED")
}

Write-Host "Export: $out ..." -ForegroundColor Cyan
& $mysql -h $hostName -P $port -u $user @sslArgs `
  --single-transaction `
  --set-gtid-purged=OFF `
  --column-statistics=0 `
  --routines --triggers `
  $dbName 2>&1 | Out-File -FilePath $out -Encoding utf8

Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue

if (Test-Path $out) {
  $len = (Get-Item $out).Length
  if ($len -gt 5000) {
    Write-Host "Tamam: $len byte" -ForegroundColor Green
    Write-Host "Sonra: .\scripts\import-aiven.ps1 -DumpFile .\$out" -ForegroundColor Green
  } else {
    Write-Host "Tamam ama dump cok kucuk: $len byte" -ForegroundColor Red
    Write-Host "DB_HOST / DB_NAME / SSL kontrol edin." -ForegroundColor Red
  }
} else {
  Write-Host "Hata: dosya olusmadi." -ForegroundColor Red
}
