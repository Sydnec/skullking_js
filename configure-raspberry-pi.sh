#!/bin/bash

# 🔧 Script de configuration avancée - Skull King Raspberry Pi
# Ce script propose des options avancées pour la configuration

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuration
APP_DIR="/home/pi/skullking"
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

# Fonction pour choisir le gestionnaire de processus
choose_process_manager() {
    echo ""
    echo -e "${GREEN}🔧 Gestionnaire de processus${NC}"
    echo ""
    echo "Quel gestionnaire de processus voulez-vous utiliser ?"
    echo ""
    echo "1) PM2 (recommandé pour développement/test)"
    echo "   • Interface de monitoring graphique"
    echo "   • Facilité d'utilisation"
    echo "   • Clustering automatique"
    echo ""
    echo "2) systemd (recommandé pour production)"
    echo "   • Intégration native au système"
    echo "   • Plus stable et sécurisé"
    echo "   • Démarrage automatique garanti"
    echo ""
    echo -n "Votre choix (1-2) : "
    read -r choice
    
    case $choice in
        1) setup_pm2 ;;
        2) setup_systemd ;;
        *) log_error "Choix invalide"; choose_process_manager ;;
    esac
}

# Configuration PM2
setup_pm2() {
    log_info "Configuration avec PM2..."
    
    cd "$APP_DIR"
    
    # Arrêter l'instance existante si elle existe
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true
    
    # Démarrer l'application
    pm2 start ecosystem.config.js --env production
    
    # Sauvegarder la configuration
    pm2 save
    
    # Configurer le démarrage automatique
    pm2 startup
    
    log_success "PM2 configuré avec succès"
    
    echo ""
    echo -e "${GREEN}🛠️  Commandes PM2 utiles :${NC}"
    echo -e "${BLUE}   • Logs : ${NC}pm2 logs $SERVICE_NAME"
    echo -e "${BLUE}   • Status : ${NC}pm2 status"
    echo -e "${BLUE}   • Restart : ${NC}pm2 restart $SERVICE_NAME"
    echo -e "${BLUE}   • Monitoring : ${NC}pm2 monit"
}

# Configuration systemd
setup_systemd() {
    log_info "Configuration avec systemd..."
    
    cd "$APP_DIR"
    
    # Arrêter PM2 si il tourne
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true
    
    # Copier le fichier service
    sudo cp skull-king.service /etc/systemd/system/
    
    # Recharger systemd
    sudo systemctl daemon-reload
    
    # Activer le service
    sudo systemctl enable skull-king
    
    # Démarrer le service
    sudo systemctl start skull-king
    
    # Vérifier le statut
    if sudo systemctl is-active --quiet skull-king; then
        log_success "Service systemd configuré et démarré"
    else
        log_error "Erreur lors du démarrage du service"
        sudo systemctl status skull-king
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🛠️  Commandes systemd utiles :${NC}"
    echo -e "${BLUE}   • Status : ${NC}sudo systemctl status skull-king"
    echo -e "${BLUE}   • Logs : ${NC}sudo journalctl -u skull-king -f"
    echo -e "${BLUE}   • Restart : ${NC}sudo systemctl restart skull-king"
    echo -e "${BLUE}   • Stop : ${NC}sudo systemctl stop skull-king"
}

# Configuration du reverse proxy nginx (optionnel)
setup_nginx() {
    echo ""
    echo "Voulez-vous configurer nginx comme reverse proxy ? (y/N)"
    echo "Cela permettra d'utiliser le port 80 et éventuellement HTTPS"
    read -r setup_nginx_choice
    
    if [ "$setup_nginx_choice" = "y" ] || [ "$setup_nginx_choice" = "Y" ]; then
        log_info "Installation et configuration de nginx..."
        
        # Installer nginx
        sudo apt update
        sudo apt install nginx -y
        
        # Créer la configuration
        sudo tee /etc/nginx/sites-available/skull-king > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Redirection vers HTTPS (décommentez si vous configurez SSL)
    # return 301 https://\$server_name\$request_uri;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout pour les WebSockets
        proxy_read_timeout 86400;
    }
    
    # Servir les fichiers statiques directement
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
        
        # Activer le site
        sudo ln -sf /etc/nginx/sites-available/skull-king /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Tester la configuration
        if sudo nginx -t; then
            sudo systemctl restart nginx
            sudo systemctl enable nginx
            log_success "nginx configuré avec succès"
            
            echo ""
            echo "🌐 Votre application est maintenant accessible sur le port 80"
            echo "   http://$(hostname -I | awk '{print $1}')"
        else
            log_error "Erreur dans la configuration nginx"
        fi
    fi
}

# Configuration HTTPS avec Let's Encrypt (optionnel)
setup_https() {
    echo ""
    echo "Voulez-vous configurer HTTPS avec Let's Encrypt ? (y/N)"
    echo "Vous devez avoir un nom de domaine pointant vers votre Pi"
    read -r setup_https_choice
    
    if [ "$setup_https_choice" = "y" ] || [ "$setup_https_choice" = "Y" ]; then
        echo "Entrez votre nom de domaine (ex: monpi.mondomaine.com) :"
        read -r domain_name
        
        if [ -n "$domain_name" ]; then
            log_info "Installation de certbot..."
            sudo apt install certbot python3-certbot-nginx -y
            
            log_info "Génération du certificat SSL..."
            sudo certbot --nginx -d "$domain_name"
            
            # Configuration du renouvellement automatique
            echo "0 2 * * * certbot renew --quiet" | sudo tee -a /etc/crontab
            
            log_success "HTTPS configuré avec succès"
            echo "Votre site est accessible sur : https://$domain_name"
        fi
    fi
}

# Configuration des tâches cron
setup_cron() {
    echo ""
    echo "Voulez-vous configurer les tâches de maintenance automatiques ? (Y/n)"
    read -r setup_cron_choice
    
    if [ "$setup_cron_choice" != "n" ] && [ "$setup_cron_choice" != "N" ]; then
        log_info "Configuration des tâches cron..."
        
        # Créer un fichier cron temporaire
        crontab -l 2>/dev/null > /tmp/skull-king-cron || true
        
        # Ajouter les tâches si elles n'existent pas déjà
        if ! grep -q "skull-king" /tmp/skull-king-cron 2>/dev/null; then
            cat >> /tmp/skull-king-cron <<EOF

# Skull King - Tâches de maintenance
# Sauvegarde quotidienne à 2h
0 2 * * * $APP_DIR/backup-db.sh >> /home/pi/logs/cron.log 2>&1

# Health check toutes les 5 minutes avec redémarrage automatique
*/5 * * * * $APP_DIR/health-check.sh --auto-restart >> /home/pi/logs/cron.log 2>&1

# Nettoyage des logs hebdomadaire (dimanche à 3h)
0 3 * * 0 find /home/pi/logs -name "*.log" -mtime +7 -delete

EOF
            
            # Installer le nouveau crontab
            crontab /tmp/skull-king-cron
            rm /tmp/skull-king-cron
            
            log_success "Tâches cron configurées"
        else
            log_info "Tâches cron déjà configurées"
        fi
    fi
}

# Configuration du monitoring système
setup_monitoring() {
    echo ""
    echo "Voulez-vous installer htop pour le monitoring système ? (Y/n)"
    read -r setup_monitoring_choice
    
    if [ "$setup_monitoring_choice" != "n" ] && [ "$setup_monitoring_choice" != "N" ]; then
        sudo apt install htop iotop -y
        log_success "Outils de monitoring installés"
        
        echo ""
        echo -e "${GREEN}🖥️  Outils de monitoring installés :${NC}"
        echo -e "${BLUE}   • htop : ${NC}Monitoring CPU/Mémoire interactif"
        echo -e "${BLUE}   • iotop : ${NC}Monitoring des I/O disque"
    fi
}

# Fonction principale
main() {
    echo -e "${GREEN}🔧 Configuration avancée Skull King sur Raspberry Pi${NC}"
    echo ""
    
    # Vérifier si l'application est déployée
    if [ ! -d "$APP_DIR" ]; then
        log_error "L'application n'est pas encore déployée"
        log_info "Utilisez d'abord le script deploy-raspberry-pi.sh"
        exit 1
    fi
    
    choose_process_manager
    setup_nginx
    setup_https
    setup_cron
    setup_monitoring
    
    echo ""
    log_success "🎉 Configuration avancée terminée !"
    echo ""
    
    # Afficher les informations finales
    PI_IP=$(hostname -I | awk '{print $1}')
    echo -e "${GREEN}📍 Accès à votre application :${NC}"
    
    if command -v nginx >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
        echo -e "${BLUE}   • HTTP : ${NC}http://$PI_IP"
        if [ -d /etc/letsencrypt/live ]; then
            echo -e "${BLUE}   • HTTPS : ${NC}https://$(ls /etc/letsencrypt/live/ | head -1)"
        fi
    else
        echo -e "${BLUE}   • Application : ${NC}http://$PI_IP:3000"
    fi
    
    echo ""
    echo -e "${GREEN}🛠️  Scripts de maintenance :${NC}"
    echo -e "${BLUE}   • Maintenance : ${NC}$APP_DIR/maintenance-raspberry-pi.sh"
    echo -e "${BLUE}   • Mise à jour : ${NC}$APP_DIR/update-raspberry-pi.sh"
    echo -e "${BLUE}   • Health check : ${NC}$APP_DIR/health-check.sh"
    echo -e "${BLUE}   • Sauvegarde : ${NC}$APP_DIR/backup-db.sh"
}

# Exécution du script principal
main "$@"
