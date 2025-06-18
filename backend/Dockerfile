FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de package
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci --only=production

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY . .

# Créer le dossier logs
RUN mkdir -p logs

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001

# Démarrer l'application
CMD ["npm", "start"]
