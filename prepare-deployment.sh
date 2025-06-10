#!/bin/bash

# 🚀 Script de préparation pour le déploiement Vercel
# Ce script prépare votre projet pour un déploiement réussi

set -e

echo "🏴‍☠️ Préparation du déploiement Skull King sur Vercel..."
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si nous sommes dans le bon dossier
if [ ! -f "package.json" ]; then
    log_error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier les dépendances
log_info "Vérification des dépendances..."

if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm n'est pas installé"
    exit 1
fi

log_success "Node.js et npm détectés"

# Installer les dépendances
log_info "Installation des dépendances..."
npm ci --production=false

# Générer le client Prisma
log_info "Génération du client Prisma..."
npx prisma generate

# Vérifier la configuration TypeScript
log_info "Vérification TypeScript..."
npm run type-check

# Linter le code
log_info "Vérification du code avec ESLint..."
npm run lint

# Test de build local
log_info "Test de build local..."
npm run build

log_success "Build local réussie !"

# Vérifier les fichiers critiques
log_info "Vérification des fichiers de configuration..."

if [ ! -f "vercel.json" ]; then
    log_warning "vercel.json non trouvé (optionnel)"
else
    log_success "vercel.json trouvé"
fi

if [ ! -f ".env.example" ]; then
    log_warning ".env.example non trouvé"
else
    log_success ".env.example trouvé"
fi

if [ ! -f ".env.production" ]; then
    log_warning ".env.production non trouvé"
else
    log_success ".env.production trouvé"
fi

# Nettoyer les fichiers temporaires
log_info "Nettoyage des fichiers temporaires..."
rm -rf .next/cache
rm -rf node_modules/.cache

# Vérifier .gitignore
log_info "Vérification du .gitignore..."
if grep -q ".env.local" .gitignore; then
    log_success ".env.local est ignoré par git"
else
    log_warning ".env.local n'est pas dans .gitignore"
fi

# Vérifier que les secrets ne sont pas commités
log_info "Vérification des secrets..."
if grep -r "your-very-secure-session-secret-here" src/ 2>/dev/null; then
    log_error "Secret par défaut trouvé dans le code source !"
    log_error "Remplacez les secrets par défaut avant le déploiement"
    exit 1
fi

log_success "Aucun secret par défaut trouvé dans le code"

# Afficher un résumé
echo ""
log_success "🎉 Préparation terminée avec succès !"
echo ""
echo -e "${BLUE}📋 Checklist de déploiement :${NC}"
echo ""
echo "✅ Dépendances installées"
echo "✅ Client Prisma généré"
echo "✅ TypeScript vérifié"
echo "✅ Code linté"
echo "✅ Build testée"
echo "✅ Configuration vérifiée"
echo ""
echo -e "${YELLOW}🚀 Prochaines étapes :${NC}"
echo ""
echo "1. Commitez vos changements :"
echo -e "   ${GREEN}git add .${NC}"
echo -e "   ${GREEN}git commit -m \"Préparation pour déploiement Vercel\"${NC}"
echo -e "   ${GREEN}git push${NC}"
echo ""
echo "2. Configurez les variables d'environnement sur Vercel :"
echo -e "   ${GREEN}DATABASE_URL${NC} - URL de votre base de données"
echo -e "   ${GREEN}SESSION_SECRET${NC} - Secret pour les sessions"
echo -e "   ${GREEN}JWT_SECRET${NC} - Secret pour les JWT"
echo -e "   ${GREEN}ALLOWED_ORIGINS${NC} - Domaines autorisés"
echo ""
echo "3. Déployez sur Vercel :"
echo -e "   ${GREEN}https://vercel.com${NC}"
echo ""
echo -e "${BLUE}📚 Documentation complète : ${GREEN}./DEPLOYMENT.md${NC}"
echo ""

# Proposer d'ouvrir le guide de déploiement
read -p "Voulez-vous ouvrir le guide de déploiement ? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code DEPLOYMENT.md
    elif command -v open &> /dev/null; then
        open DEPLOYMENT.md
    else
        log_info "Ouvrez manuellement le fichier DEPLOYMENT.md"
    fi
fi

echo ""
echo -e "${GREEN}Bon déploiement ! 🏴‍☠️${NC}"
