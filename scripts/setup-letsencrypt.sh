#!/bin/bash

# Script de configuration Let's Encrypt pour devis.mdoservices.fr
# Usage: ./setup-letsencrypt.sh [domain] [email]

set -e

DOMAIN="${1:-devis.mdoservices.fr}"
EMAIL="${2}"
STAGING="${3:-0}"  # Utiliser 1 pour le mode staging (tests)

echo "========================================="
echo "Configuration Let's Encrypt"
echo "========================================="
echo "Domaine: $DOMAIN"
echo "Email: $EMAIL"
echo "========================================="

# Vérification des paramètres
if [ -z "$EMAIL" ]; then
    echo "❌ Erreur: L'email est requis"
    echo "Usage: ./setup-letsencrypt.sh [domain] [email] [staging]"
    echo "Exemple: ./setup-letsencrypt.sh devis.mdoservices.fr admin@mdoservices.fr"
    exit 1
fi

# Configuration du mode staging si demandé
if [ "$STAGING" = "1" ]; then
    STAGING_ARG="--staging"
    echo "⚠️  Mode STAGING activé (certificats de test)"
else
    STAGING_ARG=""
    echo "✅ Mode PRODUCTION (certificats réels)"
fi

echo ""
echo "📋 Étape 1: Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi
echo "✅ Docker est installé"

echo ""
echo "📋 Étape 2: Vérification du domaine..."
echo "⚠️  Assurez-vous que:"
echo "   - Le domaine $DOMAIN pointe vers ce serveur"
echo "   - Les ports 80 et 443 sont ouverts"
echo "   - Aucun autre service n'utilise ces ports"
echo ""
read -p "Voulez-vous continuer? (o/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "📋 Étape 3: Arrêt des conteneurs existants..."
docker compose down 2>/dev/null || true

echo ""
echo "📋 Étape 4: Démarrage de Nginx (sans SSL)..."
# Démarrer Nginx temporairement avec la configuration HTTP de base
docker compose up -d frontend

echo "⏳ Attente du démarrage de Nginx (10s)..."
sleep 10

echo ""
echo "📋 Étape 5: Obtention du certificat SSL..."
docker compose -f docker-compose.https.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    --force-renewal

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'obtention du certificat"
    echo "Vérifiez que:"
    echo "   - Le domaine pointe bien vers ce serveur"
    echo "   - Les ports 80 et 443 sont accessibles"
    echo "   - Le serveur peut être atteint depuis Internet"
    exit 1
fi

echo ""
echo "✅ Certificat obtenu avec succès!"

echo ""
echo "📋 Étape 6: Redémarrage avec la configuration HTTPS..."
docker compose down
docker compose -f docker-compose.https.yml up -d

echo ""
echo "⏳ Attente du démarrage complet (15s)..."
sleep 15

echo ""
echo "========================================="
echo "✅ Configuration terminée avec succès!"
echo "========================================="
echo ""
echo "🔒 Votre site est maintenant accessible en HTTPS:"
echo "   https://$DOMAIN"
echo ""
echo "📝 Les certificats seront renouvelés automatiquement"
echo "   Emplacement: /var/lib/docker/volumes/analyse_devis_certbot_conf/_data"
echo ""
echo "🔍 Pour vérifier le statut:"
echo "   docker compose -f docker-compose.https.yml ps"
echo "   docker compose -f docker-compose.https.yml logs -f"
echo ""
echo "🔄 Pour renouveler manuellement:"
echo "   docker compose -f docker-compose.https.yml exec certbot certbot renew"
echo ""
echo "========================================="
