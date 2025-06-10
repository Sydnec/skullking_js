#!/bin/bash

# 🏴‍☠️ Script de déploiement Skull King pour Raspberry Pi
# Usage: ./deploy.sh

set -e

echo "🏴‍☠️ Déploiement Skull King sur Raspberry Pi..."

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les étapes
print_step() {
    echo -e "${GREEN}[ÉTAPE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERREUR]${NC} $1"
}

# Vérification de PM2
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 n'est pas installé. Installez-le avec: npm install -g pm2"
    exit 1
fi

print_step "Arrêt de l'application si elle est en cours d'exécution..."
pm2 stop skullking 2>/dev/null || echo "Application pas encore démarrée"

print_step "Installation des dépendances..."
npm ci --production

print_step "Génération du client Prisma..."
npx prisma generate

print_step "Construction de l'application..."
npm run build

print_step "Initialisation de la base de données de production..."
NODE_ENV=production npx prisma db push

print_step "Démarrage avec PM2..."
pm2 start ecosystem.config.js --env production

print_step "Sauvegarde de la configuration PM2..."
pm2 save

print_step "Affichage du statut..."
pm2 status

echo ""
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo ""
echo "📋 Commandes utiles :"
echo "  • Voir les logs: pm2 logs skullking"
echo "  • Redémarrer: pm2 restart skullking"
echo "  • Arrêter: pm2 stop skullking"
echo "  • Statut: pm2 status"
echo "  • Monitoring: pm2 monit"
echo ""
echo "🌐 L'application est accessible sur http://localhost:3000"
echo "   (redirigé depuis le port 80 comme configuré)"
