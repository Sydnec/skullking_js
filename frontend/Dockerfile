# Dockerfile pour SkullKing Frontend - Production
FROM node:20-alpine AS base

# Installation des dépendances du système
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./

# Installer toutes les dépendances (y compris devDependencies pour la build)
RUN npm install

# Copier le code source
COPY . .

# Variables d'environnement nécessaires pour la build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# Construire l'application Next.js
RUN npm run build

# Nettoyer les devDependencies après la build
RUN npm prune --production

# Étape de production
FROM node:20-alpine AS runner
WORKDIR /app

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
