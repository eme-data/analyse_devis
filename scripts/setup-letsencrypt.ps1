#!/bin/bash

# Script PowerShell équivalent pour Windows
# Utiliser setup-letsencrypt.ps1 au lieu de .sh

# Ce script est la version Windows du script setup-letsencrypt.sh

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "devis.mdoservices.fr",
    
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$false)]
    [int]$Staging = 0
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Configuration Let's Encrypt" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Domaine: $Domain"
Write-Host "Email: $Email"
Write-Host "=========================================" -ForegroundColor Cyan

# Configuration du mode staging
$StagingArg = ""
if ($Staging -eq 1) {
    $StagingArg = "--staging"
    Write-Host "⚠️  Mode STAGING activé (certificats de test)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Mode PRODUCTION (certificats réels)" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Étape 1: Vérification de Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker est installé" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas installé. Veuillez installer Docker d'abord." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Étape 2: Vérification du domaine..." -ForegroundColor Yellow
Write-Host "⚠️  Assurez-vous que:" -ForegroundColor Yellow
Write-Host "   - Le domaine $Domain pointe vers ce serveur"
Write-Host "   - Les ports 80 et 443 sont ouverts"
Write-Host "   - Aucun autre service n'utilise ces ports"
Write-Host ""
$continue = Read-Host "Voulez-vous continuer? (o/n)"
if ($continue -ne 'o' -and $continue -ne 'O') {
    Write-Host "❌ Annulé" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Étape 3: Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose down 2>$null

Write-Host ""
Write-Host "📋 Étape 4: Démarrage de Nginx (sans SSL)..." -ForegroundColor Yellow
docker-compose up -d frontend

Write-Host "⏳ Attente du démarrage de Nginx (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "📋 Étape 5: Obtention du certificat SSL..." -ForegroundColor Yellow
docker-compose run --rm certbot certonly `
    --webroot `
    --webroot-path=/var/www/certbot `
    -d $Domain `
    --email $Email `
    --agree-tos `
    --no-eff-email `
    $StagingArg `
    --force-renewal

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'obtention du certificat" -ForegroundColor Red
    Write-Host "Vérifiez que:" -ForegroundColor Yellow
    Write-Host "   - Le domaine pointe bien vers ce serveur"
    Write-Host "   - Les ports 80 et 443 sont accessibles"
    Write-Host "   - Le serveur peut être atteint depuis Internet"
    exit 1
}

Write-Host ""
Write-Host "✅ Certificat obtenu avec succès!" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Étape 6: Redémarrage avec la configuration HTTPS..." -ForegroundColor Yellow
docker-compose down
docker-compose -f docker-compose.https.yml up -d

Write-Host ""
Write-Host "⏳ Attente du démarrage complet (15s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Configuration terminée avec succès!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔒 Votre site est maintenant accessible en HTTPS:" -ForegroundColor Green
Write-Host "   https://$Domain"
Write-Host ""
Write-Host "📝 Les certificats seront renouvelés automatiquement"
Write-Host ""
Write-Host "🔍 Pour vérifier le statut:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.https.yml ps"
Write-Host "   docker-compose -f docker-compose.https.yml logs -f"
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
