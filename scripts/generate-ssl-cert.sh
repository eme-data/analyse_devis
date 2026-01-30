#!/bin/bash

# Script de génération de certificats SSL auto-signés pour développement local
# Usage: ./generate-ssl-cert.sh [domain]

set -e

DOMAIN="${1:-localhost}"
CERT_DIR="./ssl"
DAYS=365

echo "========================================="
echo "Génération de certificat SSL auto-signé"
echo "========================================="
echo "Domaine: $DOMAIN"
echo "Validité: $DAYS jours"
echo "========================================="

# Créer le répertoire pour les certificats
mkdir -p "$CERT_DIR"

echo ""
echo "📋 Génération de la clé privée et du certificat..."

# Générer la clé privée et le certificat
openssl req -x509 -nodes -days $DAYS -newkey rsa:2048 \
    -keyout "$CERT_DIR/$DOMAIN.key" \
    -out "$CERT_DIR/$DOMAIN.crt" \
    -subj "/C=FR/ST=France/L=Paris/O=Development/OU=IT/CN=$DOMAIN"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificat généré avec succès!"
    echo ""
    echo "📁 Fichiers créés:"
    echo "   Clé privée: $CERT_DIR/$DOMAIN.key"
    echo "   Certificat: $CERT_DIR/$DOMAIN.crt"
    echo ""
    echo "⚠️  AVERTISSEMENT: Ce certificat est auto-signé"
    echo "   Il ne doit être utilisé QUE pour le développement local"
    echo "   Les navigateurs afficheront un avertissement de sécurité"
    echo ""
    echo "🔒 Pour utiliser ce certificat avec Docker:"
    echo "   1. Mettez à jour docker-compose.yml pour monter les certificats"
    echo "   2. Mettez à jour nginx.conf pour pointer vers ces fichiers"
    echo ""
else
    echo "❌ Erreur lors de la génération du certificat"
    exit 1
fi

echo "========================================="
