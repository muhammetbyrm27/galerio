# Aiven (bayramlarauto) veritabaninda admin yapar
# Kullanim: .\scripts\make-admin.ps1

$serverDir = Join-Path $PSScriptRoot "..\server"
$email = Read-Host "Admin e-posta (siteye giris yaptiginiz)"
$password = Read-Host "Admin sifre (yeni belirleyin)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPwd = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Aiven baglanti (Render bayramlarauto Environment ile ayni)" -ForegroundColor Cyan
$env:DB_HOST = Read-Host "DB_HOST"
$env:DB_PORT = Read-Host "DB_PORT [12569]"
if ([string]::IsNullOrWhiteSpace($env:DB_PORT)) { $env:DB_PORT = "12569" }
$env:DB_USER = Read-Host "DB_USER [avnadmin]"
if ([string]::IsNullOrWhiteSpace($env:DB_USER)) { $env:DB_USER = "avnadmin" }
$env:DB_NAME = Read-Host "DB_NAME [defaultdb]"
if ([string]::IsNullOrWhiteSpace($env:DB_NAME)) { $env:DB_NAME = "defaultdb" }
$env:DB_SSL = "true"
$dbPwd = Read-Host "DB_PASSWORD (Aiven)" -AsSecureString
$B2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPwd)
$env:DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($B2)

$env:ADMIN_EMAIL = $email
$env:ADMIN_PASSWORD = $plainPwd
$env:ADMIN_NAME = Read-Host "Ad Soyad [Galeri Admin]"
if ([string]::IsNullOrWhiteSpace($env:ADMIN_NAME)) { $env:ADMIN_NAME = "Galeri Admin" }

Write-Host ""
Write-Host "Admin olusturuluyor..." -ForegroundColor Cyan
Push-Location $serverDir
node scripts/ensure-admin.js $email
$code = $LASTEXITCODE
Pop-Location

Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
$plainPwd = $null

if ($code -eq 0) {
  Write-Host ""
  Write-Host "Tamam. Siteye bu bilgilerle girin:" -ForegroundColor Green
  Write-Host "  E-posta: $email"
  Write-Host "  Sifre:   (az once yazdiginiz)"
  Write-Host "  Sonra:   /admin/vehicles"
} else {
  Write-Host "Hata oldu. Mesaji yukarida kontrol edin." -ForegroundColor Red
}
