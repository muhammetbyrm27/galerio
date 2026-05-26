# Galerio yedeğini Aiven MySQL'e aktarır (Workbench gerekmez)
# Kullanım: .\scripts\import-aiven.ps1

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dump  = (Join-Path $PSScriptRoot "..\galerio-yedek.sql" | Resolve-Path).Path
$ca    = Join-Path $PSScriptRoot "..\aiven-ca.pem"

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
    if ($Database) {
      $argList += @("-D", $Database)
    }
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
if (-not (Test-Path $dump)) {
  Write-Host "galerio-yedek.sql bulunamadi." -ForegroundColor Red
  exit 1
}

Write-Host ""
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
  Write-Host "Baglanti basarisiz (kod $testCode)." -ForegroundColor Red
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  exit 1
}

$dumpMysql = ($dump -replace '\\', '/')
Write-Host "Import basliyor -> $dbName ..." -ForegroundColor Cyan
Write-Host "Dosya: $dumpMysql" -ForegroundColor DarkGray
$importCode = Invoke-MySql -Database $dbName -ExtraArgs @("-e", "source $dumpMysql;")

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
Write-Host "Render: DB_NAME=$dbName , DB_SSL=true" -ForegroundColor Green
