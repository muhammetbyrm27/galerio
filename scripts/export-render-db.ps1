# Render servisinin (ornegin galerio-xsmd) MySQL veritabanini disa aktarir.
# Render Dashboard -> Environment -> DB_* degerlerini girin.

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
if (-not (Test-Path $mysql)) { Write-Host "mysqldump bulunamadi." -ForegroundColor Red; exit 1 }

$hostName = Read-Host "DB_HOST"
$port = Read-Host "DB_PORT"
$user = Read-Host "DB_USER"
$dbName = Read-Host "DB_NAME"
$out = Read-Host "Cikti dosyasi [xsmd-canli.sql]"
if ([string]::IsNullOrWhiteSpace($out)) { $out = "xsmd-canli.sql" }

$pwd = Read-Host "DB_PASSWORD" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd)
$env:MYSQL_PWD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$ssl = Read-Host "SSL gerekli mi? [E/h]"
$sslArgs = if ($ssl -eq 'h') { @() } else { @("--ssl-mode=REQUIRED") }

Write-Host "Export: $out" -ForegroundColor Cyan
& $mysql -h $hostName -P $port -u $user @sslArgs --single-transaction $dbName 2>$null | Out-File -FilePath $out -Encoding utf8
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue

if (Test-Path $out) {
  Write-Host "Tamam: $((Get-Item $out).Length) byte" -ForegroundColor Green
  Write-Host "Sonra: .\scripts\import-aiven.ps1 ile Aiven defaultdb'ye aktarin."
} else {
  Write-Host "Hata." -ForegroundColor Red
}
