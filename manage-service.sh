#!/bin/bash

# 🏴‍☠️ Script de gestion du service Skull King
# Usage: ./manage-service.sh [install|start|stop|restart|status|logs|uninstall]

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERREUR]${NC} $1"
}

print_usage() {
    echo -e "${BLUE}Usage:${NC} $0 [install|start|stop|restart|status|logs|uninstall]"
    echo ""
    echo "Commandes disponibles :"
    echo "  install   - Installe le service systemd"
    echo "  start     - Démarre le service"
    echo "  stop      - Arrête le service"
    echo "  restart   - Redémarre le service"
    echo "  status    - Affiche le statut du service"
    echo "  logs      - Affiche les logs du service"
    echo "  uninstall - Désinstalle le service systemd"
}

case "$1" in
    install)
        print_step "Installation du service systemd..."
        sudo cp skull-king.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable skull-king.service
        print_step "Service installé et activé pour le démarrage automatique"
        ;;
    
    start)
        print_step "Démarrage du service Skull King..."
        sudo systemctl start skull-king.service
        sleep 2
        sudo systemctl status skull-king.service --no-pager
        ;;
    
    stop)
        print_step "Arrêt du service Skull King..."
        sudo systemctl stop skull-king.service
        print_step "Service arrêté"
        ;;
    
    restart)
        print_step "Redémarrage du service Skull King..."
        sudo systemctl restart skull-king.service
        sleep 2
        sudo systemctl status skull-king.service --no-pager
        ;;
    
    status)
        print_step "Statut du service Skull King..."
        sudo systemctl status skull-king.service --no-pager
        echo ""
        print_step "Statut PM2..."
        pm2 status skullking 2>/dev/null || echo "PM2 non configuré pour cet utilisateur"
        ;;
    
    logs)
        print_step "Logs du service (Ctrl+C pour quitter)..."
        sudo journalctl -u skull-king.service -f
        ;;
    
    uninstall)
        print_warning "Désinstallation du service systemd..."
        sudo systemctl stop skull-king.service 2>/dev/null || true
        sudo systemctl disable skull-king.service 2>/dev/null || true
        sudo rm -f /etc/systemd/system/skull-king.service
        sudo systemctl daemon-reload
        print_step "Service désinstallé"
        ;;
    
    *)
        print_error "Commande invalide: $1"
        print_usage
        exit 1
        ;;
esac
