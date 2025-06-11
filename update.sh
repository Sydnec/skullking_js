#!/bin/bash

# 🏴‍☠️ Script de mise à jour Skull King
# Usage: ./update.sh

set -e

echo "🏴‍☠️ Mise à jour Skull King..."

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[ÉTAPE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERREUR]${NC} $1"
}

# Sauvegarde des logs avant redémarrage
print_step "Sauvegarde des logs actuels..."
if [ -f "./logs/combined.log" ]; then
    cp ./logs/combined.log ./logs/combined.log.backup.$(date +%Y%m%d_%H%M%S)
fi

echo -e "${YELLOW}📋 Vérification du statut PM2...${NC}"
# Vérifier si le processus PM2 existe et obtenir son statut
if pm2 describe skullking &> /dev/null; then
   print_step "✅ Processus PM2 'skullking' trouvé"

    print_step "Arrêt temporaire de l'application..."
    pm2 stop skullking
else
    print_warning "⚠️ Processus PM2 'skullking' non trouvé. Lancement du processus..."
    pm2 start server.js --name skullking

    print_step "Arrêt temporaire de l'application..."
    pm2 stop skullking
fi

print_step "Sauvegarde de la base de données..."
if [ -f "./prisma/db/production.db" ]; then
    cp ./prisma/db/production.db ./prisma/db/production.db.backup.$(date +%Y%m%d_%H%M%S)
    print_step "Base de données sauvegardée"
fi

print_step "Mise à jour des dépendances..."
npm install

print_step "Régénération du client Prisma..."
npx prisma generate

print_step "Construction de l'application..."
npm run build

print_step "Application des migrations de base de données..."
NODE_ENV=production npx prisma db push

print_step "Redémarrage de l'application..."
pm2 restart skullking

print_step "Attente de stabilisation..."
sleep 5

print_step "Vérification de santé..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Mise à jour réussie !${NC}"
    echo ""
    echo "📊 Statut actuel:"
    pm2 status skullking
    echo ""
    echo "🌐 L'application est accessible sur:"
    echo "  • Local: http://localhost:3000"
    echo "  • Réseau: http://192.168.1.151:3000"
else
    print_error "Problème détecté après la mise à jour"
    echo "Vérifiez les logs avec: pm2 logs skullking"
    exit 1
fi
