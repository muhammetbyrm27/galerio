# Galerio / xsmd SQL yedeğini Aiven MySQL'e aktarır (Aiven uyumlu temizlik)
# Kullanım: .\scripts\import-aiven.ps1
#          .\scripts\import-aiven.ps1 -DumpFile .\xsmd-canli.sql

param(
  [string]$DumpFile = ""
)

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$ca    = Join-Path $PSScriptRoot "..\aiven-ca.pem"

function Get-SanitizedDumpPath {
  param([string]$SourcePath)
  $temp = Join-Path $env:TEMP ("galerio-aiven-import-{0}.sql" -f [guid]::NewGuid().ToString("N"))
  $skip = @(
    '^\s*SET\s+@MYSQLDUMP_TEMP_LOG_BIN',
    '^\s*SET\s+@@SESSION\.SQL_LOG_BIN',
    '^\s*SET\s+@@GLOBAL\.GTID_PURGED',
    '^\s*SET\s+@@SESSION\.SQL_LOG_BIN',
    '^\s*SET\s+GLOBAL\.GTID_PURGED',
    '^\s*USE\s+`mysql`',
    '^\s*CREATE\s+DATABASE\b',
    '^\s*DROP\s+DATABASE\b'
  )
  $count = 0
  Get-Content -Path $SourcePath -Encoding UTF8 | ForEach-Object {
    $line = $_
    $drop = $false
    foreach ($pat in $skip) {
      if ($line -match $pat) { $drop = $true; $count++; break }
    }
    if (-not $drop) { $line }
  } | Set-Content -Path $temp -Encoding UTF8
  Write-Host "Aiven uyumlu dump: $temp ($count satir atlandi)" -ForegroundColor DarkGray
  return $temp
}

function Invoke-MySql {
  param(
    [string[]]$ExtraArgs,
    [string]$Database = $null
  )
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $argList = @(
      "-h", $script:hostName,
      "-P", $script:port,
      "-u", $script:user,
      "--default-character-set=utf8mb4"
    ) + $script:sslArgs
    if ($Database) { $argList += @("-D", $Database) }
    $argList += $ExtraArgs
    $out = & $mysql @argList 2>&1
    $code = $LASTEXITCODE
    foreach ($line in @($out)) {
      $text = "$line"
      if ($text -match "^\s*mysql:\s*\[Warning\]") { continue }
      if ($text -match "Unknown OS character set") { continue }
      if ($text -match "Switching to the default character set") { continue }
      if ($text -match "^Usage: ") { continue }
      if ($text -match "^Copyright \(c\)") { continue }
      Write-Host $text
    }
    return $code
  } finally {
    $ErrorActionPreference = $prevEap
  }
}

if (-not (Test-Path $mysql)) {
  Write-Host "mysql.exe bulunamadi." -ForegroundColor Red
  exit 1
}

if ([string]::IsNullOrWhiteSpace($DumpFile)) {
  $defaultDump = Join-Path $PSScriptRoot "..\xsmd-canli.sql"
  if (Test-Path $defaultDump) {
    $DumpFile = (Resolve-Path $defaultDump).Path
  } else {
    $DumpFile = (Resolve-Path (Join-Path $PSScriptRoot "..\galerio-yedek.sql")).Path
  }
} elseif (Test-Path $DumpFile) {
  $DumpFile = (Resolve-Path $DumpFile).Path
} else {
  Write-Host "Dump bulunamadi: $DumpFile" -ForegroundColor Red
  exit 1
}

$size = (Get-Item $DumpFile).Length
if ($size -lt 5000) {
  Write-Host "UYARI: Dump cok kucuk ($size byte). Tablo verisi yok olabilir." -ForegroundColor Yellow
  Write-Host "Export'u Render galerio-xsmd DB bilgileriyle yapin (Aiven host DEGIL)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Dump: $DumpFile ($size byte)" -ForegroundColor Cyan
Write-Host "Aiven -> Overview -> Connection information" -ForegroundColor Cyan
$script:hostName = Read-Host "Host"
$script:port = Read-Host "Port"
$script:user = Read-Host "User [avnadmin]"
if ([string]::IsNullOrWhiteSpace($script:user)) { $script:user = "avnadmin" }
$dbName = Read-Host "Veritabani adi [defaultdb]"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "defaultdb" }
$plainPwd = Read-Host "Sifre" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($plainPwd)
$script:dbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
$env:MYSQL_PWD = $script:dbPassword

$script:sslArgs = @("--ssl-mode=REQUIRED")
if (Test-Path $ca) {
  $script:sslArgs = @("--ssl-mode=VERIFY_CA", "--ssl-ca=$ca")
  Write-Host "CA: $ca" -ForegroundColor Green
} else {
  Write-Host "aiven-ca.pem yok; SSL REQUIRED kullaniliyor." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Baglanti test ediliyor..." -ForegroundColor Cyan
$testCode = Invoke-MySql -ExtraArgs @("-e", "SELECT 1 AS ok;")
if ($testCode -ne 0) {
  Write-Host "Baglanti basarisiz." -ForegroundColor Red
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  exit 1
}

$sanitized = Get-SanitizedDumpPath -SourcePath $DumpFile
$dumpMysql = ($sanitized -replace '\\', '/')

Write-Host "Import basliyor -> $dbName ..." -ForegroundColor Cyan
$importCode = Invoke-MySql -Database $dbName -ExtraArgs @("-e", "source $dumpMysql;")

Remove-Item $sanitized -ErrorAction SilentlyContinue
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue

if ($importCode -ne 0) {
  Write-Host "Import hata verdi (kod $importCode)." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Tamam. Tablolar:" -ForegroundColor Green
$env:MYSQL_PWD = $script:dbPassword
Invoke-MySql -Database $dbName -ExtraArgs @("-e", "SHOW TABLES;")
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
$script:dbPassword = $null
Write-Host ""
Write-Host "Kontrol: https://bayramlarauto.onrender.com/api/vehicles" -ForegroundColor Green
