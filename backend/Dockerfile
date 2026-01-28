# Utiliser l'image Node.js 20 Alpine pour plus de légèreté
FROM node:20-alpine

# Métadonnées
LABEL maintainer="votre-email@example.com"
LABEL description="Backend API pour l'analyse de devis avec Gemini"

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm install --omit=dev

# Copier le code source
COPY src/ ./src/

# Créer le dossier uploads
RUN mkdir -p uploads

# Exposer le port de l'application
EXPOSE 3000

# Définir les variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Commande de démarrage
CMD ["node", "src/server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
