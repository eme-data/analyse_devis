# Démarrage Simplifié - Analyse de Devis

## 🚀 Démarrage Rapide

### Prérequis
- Docker et Docker Compose installés
- Fichier `.env` configuré avec `GEMINI_API_KEY`

### Démarrage HTTP (Développement)
```bash
# Utiliser la configuration HTTP simple
docker compose -f docker-compose.http.yml up -d
```

### Démarrage HTTPS (Production) - PAR DÉFAUT
```bash
# 1. Configurer les variables
cp .env.example .env
nano .env  # Définir DOMAIN, LETSENCRYPT_EMAIL et GEMINI_API_KEY

# 2. Initialiser les certificats SSL
./scripts/init-ssl.sh  # Crée des certificats auto-signés temporaires

# 3. Démarrer les services
docker compose up -d

# 4. (Optionnel) Obtenir des certificats Let's Encrypt valides
./scripts/setup-letsencrypt.sh
```

## 📋 Commandes Utiles

```bash
# Voir les logs en temps réel
docker compose logs -f

# Redémarrer les services
docker compose restart

# Arrêter les services
docker compose down

# Voir le statut
docker compose ps
```

## 🔐 Configuration HTTPS

### Option A : Certificats Auto-Signés (Test)
Les certificats auto-signés sont créés automatiquement au premier démarrage.
⚠️ Les navigateurs afficheront un avertissement de sécurité.

### Option B : Let's Encrypt (Production)
```bash
# Obtenir des certificats valides
./scripts/setup-letsencrypt.sh

# Le renouvellement est automatique (service certbot)
```

## 🌐 Accès

- **HTTP** : http://localhost
- **HTTPS** : https://devis.mdoservices.fr (ou votre domaine)
- **API Backend** : http://localhost:3000

## ❓ Dépannage

### Nginx ne démarre pas
```bash
# Vérifier les logs
docker compose logs frontend

# Réinitialiser les certificats
rm -rf certbot/
./scripts/init-ssl.sh
docker compose restart frontend
```

### Erreur "certificate not found"
```bash
# Créer les certificats manuellement
./scripts/init-ssl.sh
```

Pour plus de détails, consultez [DEPLOIEMENT_HTTPS.md](DEPLOIEMENT_HTTPS.md)
