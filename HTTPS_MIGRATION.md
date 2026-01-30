# Guide de Migration HTTPS - Analyse Devis

## 🎯 Objectif

Ce guide vous accompagne dans la migration de l'application **Analyse Devis** de HTTP vers HTTPS pour le domaine **devis.mdoservices.fr**, en utilisant des certificats SSL gratuits de Let's Encrypt.

## 📋 Prérequis

Avant de commencer, assurez-vous que :

- ✅ Le domaine `devis.mdoservices.fr` pointe vers votre serveur (enregistrement DNS A)
- ✅ Docker et Docker Compose sont installés sur le serveur
- ✅ Les ports 80 et 443 sont ouverts dans le pare-feu
- ✅ Aucun autre service n'utilise les ports 80 et 443
- ✅ Vous avez accès SSH au serveur

### Vérification DNS

```bash
# Vérifier que le domaine pointe vers votre serveur
nslookup devis.mdoservices.fr

# Ou avec dig
dig devis.mdoservices.fr A
```

### Vérification des ports

```bash
# Vérifier que les ports sont libres
sudo netstat -tlnp | grep -E ':(80|443)'

# Ou avec ss
sudo ss -tlnp | grep -E ':(80|443)'
```

## 🚀 Installation HTTPS

### Méthode Automatique (Recommandée)

Le script `setup-letsencrypt.sh` automatise toute la configuration :

```bash
# Rendre le script exécutable
chmod +x scripts/setup-letsencrypt.sh

# Exécuter la configuration (remplacez l'email par le vôtre)
./scripts/setup-letsencrypt.sh devis.mdoservices.fr admin@mdoservices.fr
```

Le script va :
1. Vérifier les prérequis
2. Démarrer Nginx en mode HTTP
3. Obtenir le certificat SSL de Let's Encrypt
4. Reconfigurer Nginx en mode HTTPS
5. Activer le renouvellement automatique

### Méthode Manuelle

Si vous préférez effectuer la configuration manuellement :

#### Étape 1: Arrêter les services existants

```bash
docker-compose down
```

#### Étape 2: Créer les volumes pour les certificats

```bash
docker volume create analyse_devis_certbot_conf
docker volume create analyse_devis_certbot_www
```

#### Étape 3: Démarrer Nginx en mode HTTP basique

```bash
# Temporairement, utiliser la config HTTP de base
docker-compose up -d frontend
```

#### Étape 4: Obtenir le certificat SSL

```bash
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d devis.mdoservices.fr \
    --email admin@mdoservices.fr \
    --agree-tos \
    --no-eff-email
```

#### Étape 5: Passer à la configuration HTTPS

```bash
# Arrêter la configuration temporaire
docker-compose down

# Démarrer avec la configuration HTTPS complète
docker-compose -f docker-compose.https.yml up -d
```

## 🔍 Vérification

### Vérifier que les services sont actifs

```bash
docker-compose -f docker-compose.https.yml ps
```

Vous devriez voir 3 conteneurs actifs :
- `analyse-devis-backend` (port 3000)
- `analyse-devis-frontend` (ports 80 et 443)
- `analyse-devis-certbot`

### Tester HTTPS

```bash
# Test simple
curl -I https://devis.mdoservices.fr

# Test détaillé du certificat
openssl s_client -connect devis.mdoservices.fr:443 -servername devis.mdoservices.fr
```

### Vérifier la redirection HTTP → HTTPS

```bash
curl -I http://devis.mdoservices.fr
# Devrait retourner un code 301 avec Location: https://...
```

### Tester dans un navigateur

Ouvrez https://devis.mdoservices.fr dans votre navigateur. Vous devriez voir :
- ✅ Le cadenas vert/gris dans la barre d'adresse
- ✅ Aucun avertissement de sécurité
- ✅ Le certificat valide dans les détails

### Vérifier le grade SSL

Utilisez [SSL Labs](https://www.ssllabs.com/ssltest/) pour analyser votre configuration :

```
https://www.ssllabs.com/ssltest/analyze.html?d=devis.mdoservices.fr
```

Vous devriez obtenir un grade **A** ou **A+**.

## 🔄 Renouvellement des Certificats

### Renouvellement Automatique

Le conteneur Certbot renouvelle automatiquement les certificats tous les jours. Les certificats Let's Encrypt sont valides 90 jours et sont renouvelés 30 jours avant expiration.

### Renouvellement Manuel

Si vous souhaitez renouveler manuellement :

```bash
# Renouveler les certificats
docker-compose -f docker-compose.https.yml exec certbot certbot renew

# Recharger Nginx pour appliquer les nouveaux certificats
docker-compose -f docker-compose.https.yml exec frontend nginx -s reload
```

### Vérifier la date d'expiration

```bash
docker-compose -f docker-compose.https.yml exec certbot certbot certificates
```

## 📊 Gestion des Services

### Démarrer les services

```bash
docker-compose -f docker-compose.https.yml up -d
```

### Arrêter les services

```bash
docker-compose -f docker-compose.https.yml down
```

### Voir les logs

```bash
# Tous les services
docker-compose -f docker-compose.https.yml logs -f

# Service spécifique
docker-compose -f docker-compose.https.yml logs -f frontend
docker-compose -f docker-compose.https.yml logs -f backend
docker-compose -f docker-compose.https.yml logs -f certbot
```

### Redémarrer un service

```bash
docker-compose -f docker-compose.https.yml restart frontend
```

## 🔧 Dépannage

### Problème: Le certificat ne peut pas être obtenu

**Erreur**: `Failed to obtain certificate`

**Solutions**:
1. Vérifier que le DNS pointe vers le bon serveur
2. Vérifier que les ports 80 et 443 sont accessibles depuis Internet
3. Vérifier qu'aucun autre service n'utilise ces ports
4. Essayer en mode staging pour tester: `./scripts/setup-letsencrypt.sh devis.mdoservices.fr admin@mdoservices.fr 1`

### Problème: ERR_SSL_PROTOCOL_ERROR dans le navigateur

**Solutions**:
1. Vérifier que Nginx écoute bien sur le port 443
2. Vérifier les logs: `docker-compose -f docker-compose.https.yml logs frontend`
3. Vérifier que les certificats existent: `docker-compose -f docker-compose.https.yml exec frontend ls -la /etc/letsencrypt/live/devis.mdoservices.fr/`

### Problème: Les certificats ne se renouvellent pas

**Solutions**:
1. Vérifier les logs de Certbot: `docker-compose -f docker-compose.https.yml logs certbot`
2. Tester le renouvellement en dry-run: `docker-compose -f docker-compose.https.yml exec certbot certbot renew --dry-run`
3. Vérifier que le conteneur Certbot est actif: `docker ps | grep certbot`

### Problème: Mixed Content (contenu mixte)

Si certaines ressources ne se chargent pas après la migration HTTPS, c'est probablement du contenu mixte (HTTP dans une page HTTPS).

**Solutions**:
1. Vérifier la console du navigateur pour identifier les ressources en HTTP
2. Mettre à jour les URLs pour utiliser HTTPS ou des URLs relatives
3. Activer le header CSP: `upgrade-insecure-requests`

## 📝 Configuration des Variables d'Environnement

Mettez à jour votre fichier `.env` :

```env
# Domaine
DOMAIN=devis.mdoservices.fr

# Email pour Let's Encrypt
LETSENCRYPT_EMAIL=admin@mdoservices.fr

# Autres variables existantes
GEMINI_API_KEY=votre_clé_api
```

## 🔐 Sécurité Supplémentaire

La configuration Nginx inclut déjà des headers de sécurité optimisés :

- **HSTS**: Force HTTPS pendant 1 an
- **X-Frame-Options**: Protection contre le clickjacking
- **X-Content-Type-Options**: Protection contre le MIME sniffing
- **CSP**: Content Security Policy de base
- **TLS 1.2+**: Protocoles modernes uniquement
- **Ciphers modernes**: Chiffrements sécurisés

## 📱 Test Mobile

N'oubliez pas de tester sur différents appareils :

- Desktop (Chrome, Firefox, Safari, Edge)
- Mobile (iOS Safari, Android Chrome)
- Tablettes

## 🎓 Ressources Utiles

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Security Headers](https://securityheaders.com/)

## 📞 Support

En cas de problème :

1. Vérifier les logs: `docker-compose -f docker-compose.https.yml logs -f`
2. Consulter la section Dépannage ci-dessus
3. Vérifier la configuration DNS
4. Tester les ports avec `telnet` ou `nc`

---

**✨ Bonne migration HTTPS !**
