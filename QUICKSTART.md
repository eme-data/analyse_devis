# Guide de Démarrage Rapide

## 🚀 Démarrage Rapide

### 1. Configuration Initiale

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer et ajouter votre clé API Gemini
nano .env
```

### 2. Obtenir une Clé API Gemini

1. Visitez [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Copiez la clé et ajoutez-la dans le fichier `.env`

### 3. Lancer l'Application

```bash
# Avec Docker (recommandé)
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
docker compose logs -f
```

### 4. Accéder à l'Application

- **Frontend** : http://localhost
- **API Backend** : http://localhost:3000
- **Health Check** : http://localhost/health

## 📝 Test Rapide

1. Ouvrez http://localhost dans votre navigateur
2. Glissez-déposez deux fichiers PDF de devis
3. Cliquez sur "Analyser les devis"
4. Consultez les résultats de l'analyse

## 🔧 Commandes Utiles

```bash
# Voir les logs en temps réel
docker compose logs -f

# Redémarrer l'application
docker compose restart

# Arrêter l'application
docker compose down

# Tout nettoyer (attention: supprime les volumes)
docker compose down -v
```

## ❓ Besoin d'Aide ?

Consultez le [README.md](./README.md) complet pour plus de détails.
