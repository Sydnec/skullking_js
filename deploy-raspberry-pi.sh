#!/bin/bash

# 🍓 Script de déploiement Raspberry Pi - Skull King
# Ce script automatise le déploiement sur un Raspberry Pi

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuration
APP_DIR="/home/pi/skullking"
BACKUP_DIR="/home/pi/backups"
LOG_DIR="/home/pi/logs"
SERVICE_NAME="skull-king"

# Fonctions d'affichage
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

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Fonction pour créer les dossiers nécessaires
create_directories() {
    log_info "Création des dossiers nécessaires..."
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$APP_DIR"
    log_success "Dossiers créés"
}

# Fonction pour installer les dépendances système
install_system_dependencies() {
    log_info "Installation des dépendances système..."
    
    # Mise à jour du système
    sudo apt update && sudo apt upgrade -y
    
    # Installation de Node.js si pas présent
    if ! command_exists node; then
        log_info "Installation de Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Installation de PM2 si pas présent
    if ! command_exists pm2; then
        log_info "Installation de PM2..."
        sudo npm install -g pm2
    fi
    
    # Installation de Git si pas présent
    if ! command_exists git; then
        log_info "Installation de Git..."
        sudo apt install git -y
    fi
    
    log_success "Dépendances système installées"
}

# Fonction pour cloner ou mettre à jour le code
deploy_application() {
    log_info "Déploiement de l'application..."
    
    if [ -d "$APP_DIR/.git" ]; then
        log_info "Mise à jour du code existant..."
        cd "$APP_DIR"
        git pull origin main
    else
        log_info "Clonage du repository..."
        log_warning "Veuillez entrer l'URL de votre repository Git:"
        read -r REPO_URL
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    log_success "Code déployé"
}

# Fonction pour installer les dépendances Node.js
install_node_dependencies() {
    log_info "Installation des dépendances Node.js..."
    cd "$APP_DIR"
    npm install
    log_success "Dépendances Node.js installées"
}

# Fonction pour configurer la base de données
setup_database() {
    log_info "Configuration de la base de données..."
    cd "$APP_DIR"
    
    # Créer le dossier de base de données s'il n'existe pas
    mkdir -p prisma/db
    
    # Générer le client Prisma
    npm run db:generate
    
    # Appliquer les migrations
    npm run db:push
    
    log_success "Base de données configurée"
}

# Fonction pour configurer les variables d'environnement
setup_environment() {
    log_info "Configuration des variables d'environnement..."
    cd "$APP_DIR"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warning "Fichier .env créé à partir de .env.example"
            log_warning "Veuillez éditer le fichier .env avec vos configurations:"
            log_warning "  - DATABASE_URL"
            log_warning "  - ALLOWED_ORIGINS (avec l'IP de votre Pi)"
            log_warning "  - SESSION_SECRET et JWT_SECRET"
            echo ""
            echo "Voulez-vous éditer le fichier .env maintenant ? (y/n)"
            read -r EDIT_ENV
            if [ "$EDIT_ENV" = "y" ] || [ "$EDIT_ENV" = "Y" ]; then
                nano .env
            fi
        else
            log_error "Aucun fichier .env.example trouvé"
            exit 1
        fi
    else
        log_info "Fichier .env existant trouvé"
    fi
    
    log_success "Variables d'environnement configurées"
}

# Fonction pour build l'application
build_application() {
    log_info "Build de l'application..."
    cd "$APP_DIR"
    npm run build
    log_success "Application buildée"
}

# Fonction pour configurer PM2
setup_pm2() {
    log_info "Configuration de PM2..."
    cd "$APP_DIR"
    
    # Arrêter l'instance existante si elle existe
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true
    
    # Démarrer l'application
    pm2 start ecosystem.config.js --env production
    
    # Sauvegarder la configuration
    pm2 save
    
    # Configurer le démarrage automatique
    pm2 startup
    
    log_success "PM2 configuré"
}

# Fonction pour configurer le firewall
setup_firewall() {
    log_info "Configuration du firewall..."
    
    if command_exists ufw; then
        # Autoriser SSH
        sudo ufw allow ssh
        
        # Autoriser le port de l'application
        sudo ufw allow 3000
        
        # Activer le firewall si pas déjà fait
        if ! sudo ufw status | grep -q "Status: active"; then
            echo "y" | sudo ufw enable
        fi
        
        log_success "Firewall configuré"
    else
        log_warning "UFW non installé, firewall non configuré"
    fi
}

# Fonction pour afficher les informations finales
show_final_info() {
    echo ""
    log_success "🏴‍☠️ Déploiement Skull King terminé !"
    echo ""
    
    # Obtenir l'IP du Pi
    PI_IP=$(ip route get 1 | awk '{print $7; exit}')
    
    echo -e "${GREEN}📍 Informations d'accès :${NC}"
    echo -e "${BLUE}   • URL locale : ${NC}http://localhost:3000"
    echo -e "${BLUE}   • URL réseau : ${NC}http://$PI_IP:3000"
    echo ""
    
    echo -e "${GREEN}🛠️  Commandes utiles :${NC}"
    echo -e "${BLUE}   • Logs : ${NC}pm2 logs $SERVICE_NAME"
    echo -e "${BLUE}   • Status : ${NC}pm2 status"
    echo -e "${BLUE}   • Restart : ${NC}pm2 restart $SERVICE_NAME"
    echo -e "${BLUE}   • Monitoring : ${NC}pm2 monit"
    echo ""
    
    echo -e "${GREEN}📚 Documentation :${NC}"
    echo -e "${BLUE}   • Guide complet : ${NC}$APP_DIR/DEPLOYMENT_RASPBERRY_PI.md"
    echo ""
}

# Fonction principale
main() {
    echo -e "${GREEN}🏴‍☠️ Script de déploiement Skull King sur Raspberry Pi${NC}"
    echo ""
    
    log_info "Début du déploiement..."
    
    create_directories
    install_system_dependencies
    deploy_application
    install_node_dependencies
    setup_environment
    setup_database
    build_application
    setup_pm2
    setup_firewall
    show_final_info
    
    log_success "Déploiement terminé avec succès !"
}

# Exécution du script principal
main "$@"
