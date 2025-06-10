#!/bin/bash

# 🛠️ Script de maintenance Raspberry Pi - Skull King
# Ce script facilite les tâches de maintenance courantes

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

# Fonction pour afficher le menu
show_menu() {
    echo -e "${GREEN}🏴‍☠️ Maintenance Skull King - Raspberry Pi${NC}"
    echo ""
    echo "Que souhaitez-vous faire ?"
    echo ""
    echo "1) 📊 Voir le statut des services"
    echo "2) 📋 Voir les logs"
    echo "3) 🔄 Redémarrer l'application"
    echo "4) 🛑 Arrêter l'application"
    echo "5) ▶️  Démarrer l'application"
    echo "6) 💾 Sauvegarder la base de données"
    echo "7) 🗂️  Gérer les sauvegardes"
    echo "8) 🧹 Nettoyer les logs"
    echo "9) 📈 Monitoring en temps réel"
    echo "10) 🔧 Diagnostic système"
    echo "11) 📡 Tester la connectivité"
    echo "12) 📋 Informations système"
    echo "0) 🚪 Quitter"
    echo ""
    echo -n "Votre choix : "
}

# Fonction 1: Statut des services
show_status() {
    log_info "Statut des services..."
    echo ""
    pm2 list
    echo ""
    
    # Vérifier si l'application répond
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "Application accessible"
    else
        log_error "Application non accessible"
    fi
}

# Fonction 2: Voir les logs
show_logs() {
    echo ""
    echo "Quel type de logs voulez-vous voir ?"
    echo "1) Logs temps réel"
    echo "2) Logs d'erreur"
    echo "3) Logs combinés"
    echo "4) Logs système"
    echo -n "Votre choix : "
    read -r log_choice
    
    case $log_choice in
        1) pm2 logs "$SERVICE_NAME" --lines 50 ;;
        2) pm2 logs "$SERVICE_NAME" --err --lines 50 ;;
        3) pm2 logs "$SERVICE_NAME" --lines 100 ;;
        4) sudo journalctl -u pm2-pi -f ;;
        *) log_error "Choix invalide" ;;
    esac
}

# Fonction 3: Redémarrer l'application
restart_app() {
    log_info "Redémarrage de l'application..."
    pm2 restart "$SERVICE_NAME"
    sleep 3
    
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        log_success "Application redémarrée avec succès"
    else
        log_error "Erreur lors du redémarrage"
    fi
}

# Fonction 4: Arrêter l'application
stop_app() {
    log_warning "Arrêt de l'application..."
    pm2 stop "$SERVICE_NAME"
    log_success "Application arrêtée"
}

# Fonction 5: Démarrer l'application
start_app() {
    log_info "Démarrage de l'application..."
    pm2 start "$SERVICE_NAME"
    sleep 3
    
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        log_success "Application démarrée avec succès"
    else
        log_error "Erreur lors du démarrage"
    fi
}

# Fonction 6: Sauvegarder la base de données
backup_database() {
    log_info "Sauvegarde de la base de données..."
    
    DATE=$(date +%Y%m%d_%H%M%S)
    DB_FILE="$APP_DIR/prisma/db/production.db"
    
    if [ -f "$DB_FILE" ]; then
        mkdir -p "$BACKUP_DIR"
        cp "$DB_FILE" "$BACKUP_DIR/skull_king_backup_$DATE.db"
        log_success "Base de données sauvegardée : skull_king_backup_$DATE.db"
        
        # Afficher la taille du fichier
        SIZE=$(du -h "$BACKUP_DIR/skull_king_backup_$DATE.db" | cut -f1)
        log_info "Taille de la sauvegarde : $SIZE"
    else
        log_error "Base de données non trouvée"
    fi
}

# Fonction 7: Gérer les sauvegardes
manage_backups() {
    echo ""
    log_info "Gestion des sauvegardes..."
    echo ""
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
        echo "Sauvegardes disponibles :"
        ls -lh "$BACKUP_DIR"/skull_king_backup_*.db 2>/dev/null | while read -r line; do
            echo "  $line"
        done
        
        echo ""
        echo "Actions disponibles :"
        echo "1) Restaurer une sauvegarde"
        echo "2) Supprimer les anciennes sauvegardes"
        echo "3) Retour"
        echo -n "Votre choix : "
        read -r backup_choice
        
        case $backup_choice in
            1) restore_backup ;;
            2) cleanup_old_backups ;;
            3) return ;;
            *) log_error "Choix invalide" ;;
        esac
    else
        log_warning "Aucune sauvegarde trouvée"
    fi
}

# Fonction pour restaurer une sauvegarde
restore_backup() {
    echo ""
    log_warning "⚠️  ATTENTION : Cette opération va remplacer la base de données actuelle"
    echo "Êtes-vous sûr de vouloir continuer ? (y/N)"
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        echo "Entrez le nom du fichier de sauvegarde (sans le chemin) :"
        read -r backup_file
        
        if [ -f "$BACKUP_DIR/$backup_file" ]; then
            # Arrêter l'application
            pm2 stop "$SERVICE_NAME"
            
            # Sauvegarder la base actuelle
            backup_database
            
            # Restaurer la sauvegarde
            cp "$BACKUP_DIR/$backup_file" "$APP_DIR/prisma/db/production.db"
            
            # Redémarrer l'application
            pm2 start "$SERVICE_NAME"
            
            log_success "Sauvegarde restaurée avec succès"
        else
            log_error "Fichier de sauvegarde non trouvé"
        fi
    fi
}

# Fonction pour nettoyer les anciennes sauvegardes
cleanup_old_backups() {
    echo ""
    echo "Supprimer les sauvegardes plus anciennes que combien de jours ? (défaut: 30)"
    read -r days
    days=${days:-30}
    
    find "$BACKUP_DIR" -name "skull_king_backup_*.db" -mtime +"$days" -delete
    log_success "Anciennes sauvegardes supprimées"
}

# Fonction 8: Nettoyer les logs
cleanup_logs() {
    log_info "Nettoyage des logs..."
    
    # Nettoyer les logs PM2
    pm2 flush
    
    # Nettoyer les fichiers de logs anciens
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_success "Logs nettoyés"
}

# Fonction 9: Monitoring temps réel
monitoring() {
    log_info "Démarrage du monitoring en temps réel..."
    echo "Appuyez sur Ctrl+C pour quitter"
    pm2 monit
}

# Fonction 10: Diagnostic système
system_diagnostic() {
    log_info "Diagnostic système..."
    echo ""
    
    # Utilisation CPU et mémoire
    echo -e "${BLUE}💻 Utilisation des ressources :${NC}"
    top -bn1 | head -5
    echo ""
    
    # Espace disque
    echo -e "${BLUE}💾 Espace disque :${NC}"
    df -h | grep -E '^/dev/'
    echo ""
    
    # Température du CPU (Raspberry Pi)
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
        TEMP_C=$((TEMP / 1000))
        echo -e "${BLUE}🌡️  Température CPU : ${NC}${TEMP_C}°C"
        
        if [ $TEMP_C -gt 70 ]; then
            log_warning "Température élevée détectée"
        fi
    fi
    echo ""
    
    # Vérifier l'état du service
    echo -e "${BLUE}🔧 État de l'application :${NC}"
    pm2 show "$SERVICE_NAME" 2>/dev/null || log_error "Service non trouvé"
}

# Fonction 11: Test de connectivité
test_connectivity() {
    log_info "Test de connectivité..."
    echo ""
    
    # Test local
    echo -e "${BLUE}🏠 Test local :${NC}"
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "Application accessible localement"
    else
        log_error "Application non accessible localement"
    fi
    
    # Test réseau
    PI_IP=$(ip route get 1 | awk '{print $7; exit}')
    echo -e "${BLUE}🌐 Test réseau (IP: $PI_IP) :${NC}"
    if curl -f "http://$PI_IP:3000/api/health" >/dev/null 2>&1; then
        log_success "Application accessible depuis le réseau"
    else
        log_error "Application non accessible depuis le réseau"
    fi
    
    # Test de connectivité Internet
    echo -e "${BLUE}🌍 Test Internet :${NC}"
    if ping -c 1 google.com >/dev/null 2>&1; then
        log_success "Connexion Internet OK"
    else
        log_error "Pas de connexion Internet"
    fi
}

# Fonction 12: Informations système
system_info() {
    log_info "Informations système..."
    echo ""
    
    # Info système
    echo -e "${BLUE}🖥️  Système :${NC}"
    uname -a
    echo ""
    
    # Info Raspberry Pi
    if [ -f /proc/device-tree/model ]; then
        echo -e "${BLUE}🍓 Modèle Raspberry Pi :${NC}"
        cat /proc/device-tree/model
        echo ""
    fi
    
    # Versions des outils
    echo -e "${BLUE}🛠️  Versions :${NC}"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  PM2: $(pm2 --version)"
    echo ""
    
    # IP du Pi
    PI_IP=$(ip route get 1 | awk '{print $7; exit}')
    echo -e "${BLUE}📡 Adresse IP :${NC} $PI_IP"
    echo ""
    
    # Uptime
    echo -e "${BLUE}⏱️  Uptime système :${NC}"
    uptime
    echo ""
}

# Boucle principale
main() {
    while true; do
        clear
        show_menu
        read -r choice
        
        case $choice in
            1) show_status ;;
            2) show_logs ;;
            3) restart_app ;;
            4) stop_app ;;
            5) start_app ;;
            6) backup_database ;;
            7) manage_backups ;;
            8) cleanup_logs ;;
            9) monitoring ;;
            10) system_diagnostic ;;
            11) test_connectivity ;;
            12) system_info ;;
            0) log_info "Au revoir !"; exit 0 ;;
            *) log_error "Choix invalide" ;;
        esac
        
        echo ""
        echo "Appuyez sur Entrée pour continuer..."
        read -r
    done
}

# Exécution du script principal
main "$@"
