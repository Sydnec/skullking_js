# Dockerfile pour SkullKing Backend - Production
FROM node:20-alpine

# Installation des dépendances du système
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 skullking

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./

# Installer TOUTES les dépendances (y compris dev) pour pouvoir compiler
RUN npm install

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Construire l'application
RUN npm run build

# Supprimer les devDependencies après la compilation (garder les types et outils nécessaires)
RUN npm prune --omit=dev

# Changer la propriété des fichiers
RUN chown -R skullking:nodejs /app

USER skullking

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
