#!/bin/bash

# 🔄 Script de mise à jour Raspberry Pi - Skull King
# Ce script met à jour l'application déjà déployée

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

# Fonction pour sauvegarder la base de données
backup_database() {
    log_info "Sauvegarde de la base de données..."
    
    DATE=$(date +%Y%m%d_%H%M%S)
    DB_FILE="$APP_DIR/prisma/db/production.db"
    
    if [ -f "$DB_FILE" ]; then
        cp "$DB_FILE" "$BACKUP_DIR/skull_king_backup_$DATE.db"
        log_success "Base de données sauvegardée : skull_king_backup_$DATE.db"
    else
        log_warning "Aucune base de données trouvée à sauvegarder"
    fi
}

# Fonction pour mettre à jour le code
update_code() {
    log_info "Mise à jour du code..."
    cd "$APP_DIR"
    
    # Vérifier s'il y a des changements locaux
    if ! git diff-index --quiet HEAD --; then
        log_warning "Des modifications locales ont été détectées"
        log_warning "Voulez-vous les sauvegarder ? (y/n)"
        read -r SAVE_CHANGES
        if [ "$SAVE_CHANGES" = "y" ] || [ "$SAVE_CHANGES" = "Y" ]; then
            git stash push -m "Automatic stash before update $(date)"
            log_info "Modifications sauvegardées dans le stash"
        fi
    fi
    
    # Récupérer les dernières modifications
    git pull origin main
    log_success "Code mis à jour"
}

# Fonction pour mettre à jour les dépendances
update_dependencies() {
    log_info "Mise à jour des dépendances..."
    cd "$APP_DIR"
    npm install
    log_success "Dépendances mises à jour"
}

# Fonction pour mettre à jour la base de données
update_database() {
    log_info "Mise à jour de la base de données..."
    cd "$APP_DIR"
    
    # Générer le client Prisma
    npm run db:generate
    
    # Appliquer les migrations
    npm run db:push
    
    log_success "Base de données mise à jour"
}

# Fonction pour rebuild l'application
rebuild_application() {
    log_info "Rebuild de l'application..."
    cd "$APP_DIR"
    
    # Nettoyer le cache
    npm run clean 2>/dev/null || true
    
    # Rebuild
    npm run build
    log_success "Application rebuildée"
}

# Fonction pour redémarrer les services
restart_services() {
    log_info "Redémarrage des services..."
    
    # Redémarrer PM2
    pm2 restart "$SERVICE_NAME"
    
    # Attendre que l'application démarre
    sleep 5
    
    # Vérifier le statut
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        log_success "Service redémarré avec succès"
    else
        log_error "Erreur lors du redémarrage du service"
        log_info "Logs d'erreur :"
        pm2 logs "$SERVICE_NAME" --lines 10
        exit 1
    fi
}

# Fonction pour tester l'application
test_application() {
    log_info "Test de l'application..."
    
    # Attendre que l'application soit prête
    sleep 3
    
    # Tester la route de health check
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "Application fonctionne correctement"
    else
        log_error "L'application ne répond pas correctement"
        log_info "Vérifiez les logs : pm2 logs $SERVICE_NAME"
        exit 1
    fi
}

# Fonction pour afficher le statut final
show_status() {
    echo ""
    log_success "🏴‍☠️ Mise à jour Skull King terminée !"
    echo ""
    
    # Obtenir l'IP du Pi
    PI_IP=$(ip route get 1 | awk '{print $7; exit}')
    
    echo -e "${GREEN}📍 Application accessible sur :${NC}"
    echo -e "${BLUE}   • URL locale : ${NC}http://localhost:3000"
    echo -e "${BLUE}   • URL réseau : ${NC}http://$PI_IP:3000"
    echo ""
    
    echo -e "${GREEN}📊 Statut des services :${NC}"
    pm2 list
    echo ""
    
    echo -e "${GREEN}🛠️  Commandes utiles :${NC}"
    echo -e "${BLUE}   • Logs : ${NC}pm2 logs $SERVICE_NAME"
    echo -e "${BLUE}   • Monitoring : ${NC}pm2 monit"
    echo -e "${BLUE}   • Restart : ${NC}pm2 restart $SERVICE_NAME"
    echo ""
}

# Fonction principale
main() {
    echo -e "${GREEN}🔄 Script de mise à jour Skull King sur Raspberry Pi${NC}"
    echo ""
    
    # Vérifier si l'application est déjà déployée
    if [ ! -d "$APP_DIR" ]; then
        log_error "L'application n'est pas encore déployée"
        log_info "Utilisez d'abord le script deploy-raspberry-pi.sh"
        exit 1
    fi
    
    log_info "Début de la mise à jour..."
    
    backup_database
    update_code
    update_dependencies
    update_database
    rebuild_application
    restart_services
    test_application
    show_status
    
    log_success "Mise à jour terminée avec succès !"
}

# Gestion des options de ligne de commande
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Afficher cette aide"
        echo "  --no-backup    Ne pas sauvegarder la base de données"
        echo "  --force        Forcer la mise à jour même en cas de modifications locales"
        echo ""
        exit 0
        ;;
    --no-backup)
        log_warning "Sauvegarde de la base de données désactivée"
        backup_database() { log_info "Sauvegarde ignorée"; }
        ;;
    --force)
        log_warning "Mode force activé"
        ;;
esac

# Exécution du script principal
main "$@"
