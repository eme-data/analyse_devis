#!/bin/bash

###############################################################################
# Script d'initialisation des certificats SSL
# Ce script crée des certificats auto-signés si Let's Encrypt n'est pas configuré
###############################################################################

set -e

DOMAIN="${DOMAIN:-devis.mdoservices.fr}"
CERT_DIR="./certbot/conf/live/$DOMAIN"

echo "🔐 Vérification des certificats SSL..."

# Vérifier si les certificats Let's Encrypt existent déjà
if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    echo "✅ Certificats Let's Encrypt trouvés pour $DOMAIN"
    exit 0
fi

echo "⚠️  Aucun certificat Let's Encrypt trouvé"
echo "📝 Création de certificats auto-signés temporaires..."

# Créer les répertoires nécessaires
mkdir -p "$CERT_DIR"

# Générer certificats auto-signés
openssl req -x509 -nodes -newkey rsa:2048 \
    -days 365 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/C=FR/ST=France/L=Paris/O=MDO Services/OU=IT/CN=$DOMAIN"

# Créer les liens symboliques comme Let's Encrypt
ln -sf fullchain.pem "$CERT_DIR/cert.pem"
ln -sf privkey.pem "$CERT_DIR/privkey.pem"

echo "✅ Certificats auto-signés créés pour $DOMAIN"
echo ""
echo "⚠️  ATTENTION : Ces certificats ne sont PAS reconnus par les navigateurs"
echo "Pour obtenir des certificats valides, exécutez :"
echo "   ./scripts/setup-letsencrypt.sh"
echo ""
