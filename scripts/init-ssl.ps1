# Script d'initialisation des certificats SSL pour Windows
# Ce script crée des certificats auto-signés si Let's Encrypt n'est pas configuré

param(
    [string]$Domain = $env:DOMAIN
)

if (-not $Domain) {
    $Domain = "devis.mdoservices.fr"
}

$CertDir = ".\certbot\conf\live\$Domain"

Write-Host "🔐 Vérification des certificats SSL..." -ForegroundColor Cyan

# Vérifier si les certificats Let's Encrypt existent déjà
if ((Test-Path "$CertDir\fullchain.pem") -and (Test-Path "$CertDir\privkey.pem")) {
    Write-Host "✅ Certificats Let's Encrypt trouvés pour $Domain" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Aucun certificat Let's Encrypt trouvé" -ForegroundColor Yellow
Write-Host "📝 Création de certificats auto-signés temporaires..." -ForegroundColor Cyan

# Créer les répertoires nécessaires
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

# Générer certificats auto-signés avec OpenSSL (doit être installé)
$opensslPath = "openssl"
if (-not (Get-Command $opensslPath -ErrorAction SilentlyContinue)) {
    Write-Host "❌ OpenSSL n'est pas installé. Veuillez l'installer ou utiliser WSL." -ForegroundColor Red
    Write-Host "   Téléchargez OpenSSL depuis: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

& $opensslPath req -x509 -nodes -newkey rsa:2048 `
    -days 365 `
    -keyout "$CertDir\privkey.pem" `
    -out "$CertDir\fullchain.pem" `
    -subj "/C=FR/ST=France/L=Paris/O=MDO Services/OU=IT/CN=$Domain"

# Créer les liens (copies sur Windows)
Copy-Item "$CertDir\fullchain.pem" -Destination "$CertDir\cert.pem"

Write-Host "✅ Certificats auto-signés créés pour $Domain" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  ATTENTION : Ces certificats ne sont PAS reconnus par les navigateurs" -ForegroundColor Yellow
Write-Host "Pour obtenir des certificats valides, exécutez :" -ForegroundColor Cyan
Write-Host "   .\scripts\setup-letsencrypt.ps1" -ForegroundColor White
Write-Host ""
