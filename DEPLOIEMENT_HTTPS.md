# Guide de Déploiement HTTPS - Résumé Rapide

## 🚀 Déploiement en Production

### Commande Unique (Méthode Automatique)

Sur votre serveur de production, dans le répertoire du projet :

```bash
# 1. Rendre le script exécutable
chmod +x scripts/setup-letsencrypt.sh

# 2. Exécuter la configuration complète
./scripts/setup-letsencrypt.sh devis.mdoservices.fr admin@mdoservices.fr
```

C'est tout ! Le script va automatiquement :
- ✅ Démarrer Nginx en HTTP
- ✅ Obtenir le certificat SSL de Let's Encrypt
- ✅ Reconfigurer en HTTPS
- ✅ Activer le renouvellement automatique

### Vérification Rapide

```bash
# Vérifier les services
docker compose -f docker-compose.https.yml ps

# Tester HTTPS
curl -I https://devis.mdoservices.fr

# Voir les logs
docker compose -f docker-compose.https.yml logs -f
```

## 📋 Prérequis Importants

Avant d'exécuter le script, assurez-vous que :

1. **DNS configuré** : `devis.mdoservices.fr` pointe vers votre serveur
2. **Ports ouverts** : 80 et 443 accessibles depuis Internet
3. **Docker installé** : Docker et Docker Compose opérationnels
4. **Aucun conflit** : Aucun autre service sur les ports 80/443

### Vérification DNS

```bash
# Doit retourner l'IP de votre serveur
nslookup devis.mdoservices.fr
```

## 📁 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `frontend/nginx-https.conf` | Configuration Nginx avec SSL |
| `docker-compose.https.yml` | Docker Compose pour HTTPS |
| `scripts/setup-letsencrypt.sh` | Script de configuration automatique |
| `scripts/generate-ssl-cert.sh` | Certificats auto-signés (dev) |
| `HTTPS_MIGRATION.md` | Guide complet |

## 🔄 Commandes Utiles

```bash
# Démarrer en HTTPS
docker compose -f docker-compose.https.yml up -d

# Arrêter
docker compose -f docker-compose.https.yml down

# Redémarrer
docker compose -f docker-compose.https.yml restart

# Renouveler les certificats manuellement
docker compose -f docker-compose.https.yml exec certbot certbot renew

# Voir l'expiration des certificats
docker compose -f docker-compose.https.yml exec certbot certbot certificates
```

## 🎯 Points Clés

- 🔒 **Redirection automatique** : HTTP → HTTPS configurée
- 🔄 **Renouvellement auto** : Certificats renouvelés automatiquement
- ⚡ **HTTP/2 activé** : Meilleures performances
- 🛡️ **Headers de sécurité** : HSTS, CSP, etc. configurés
- 📊 **Grade A sur SSL Labs** : Configuration optimisée

## 📖 Documentation Complète

Pour plus de détails, consultez [HTTPS_MIGRATION.md](file:///c:/Users/MDO%20SERVICES/Documents/github/analyse_devis/analyse_devis/HTTPS_MIGRATION.md)

---

**✨ Votre site sera accessible en HTTPS en quelques minutes !**
