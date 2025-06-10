#!/bin/bash

# 🏴‍☠️ Script de monitoring Skull King
# Usage: ./monitor.sh

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction pour afficher les informations
print_header() {
    echo -e "${PURPLE}🏴‍☠️ SKULL KING - MONITORING${NC}"
    echo "================================="
    echo ""
}

print_section() {
    echo -e "${CYAN}📊 $1${NC}"
    echo "----------------------------"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction principale de monitoring
main() {
    clear
    print_header
    
    # 1. Statut PM2
    print_section "Statut PM2"
    if pm2 list 2>/dev/null | grep -q "skullking"; then
        pm2 list
        echo ""
        
        # Vérifier si l'application est en ligne
        if pm2 list 2>/dev/null | grep "skullking" | grep -q "online"; then
            print_success "Application Skull King en ligne"
        else
            print_error "Application Skull King hors ligne"
        fi
    else
        print_error "Aucune application PM2 trouvée"
    fi
    
    echo ""
    
    # 2. Test de santé de l'API
    print_section "Test de l'API"
    if curl -s http://localhost:3000/api/health > /dev/null; then
        HEALTH_STATUS=$(curl -s http://localhost:3000/api/health)
        print_success "API accessible"
        echo "Réponse: $HEALTH_STATUS"
    else
        print_error "API inaccessible"
    fi
    
    echo ""
    
    # 3. Utilisation des ressources
    print_section "Ressources système"
    
    # Mémoire
    MEMORY=$(free -h | awk 'NR==2{printf "Utilisée: %s/%s (%.2f%%)", $3,$2,$3*100/$2 }')
    echo "💾 Mémoire: $MEMORY"
    
    # CPU
    CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
    echo "🔥 CPU: ${CPU}% utilisé"
    
    # Disque
    DISK=$(df -h /home/sydnec | awk 'NR==2{printf "Utilisé: %s/%s (%s)", $3,$2,$5}')
    echo "💿 Disque: $DISK"
    
    echo ""
    
    # 4. Connectivité réseau
    print_section "Connectivité réseau"
    
    # IP locale
    LOCAL_IP=$(ip route get 8.8.8.8 | awk '{print $7}' | head -1)
    echo "🌐 IP locale: $LOCAL_IP"
    
    # Test du port 3000
    if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
        print_success "Port 3000 ouvert et en écoute"
    else
        print_error "Port 3000 non accessible"
    fi
    
    # Test du port 80 (redirection)
    if netstat -tlnp 2>/dev/null | grep -q ":80"; then
        print_success "Port 80 ouvert (redirection configurée)"
    else
        print_warning "Port 80 non ouvert (redirection non configurée)"
    fi
    
    echo ""
    
    # 5. Logs récents
    print_section "Logs récents (dernières 5 lignes)"
    if pm2 logs skullking --lines 5 --nostream 2>/dev/null; then
        echo ""
    else
        print_warning "Impossible de récupérer les logs PM2"
    fi
    
    echo ""
    
    # 6. Informations de déploiement
    print_section "Informations de déploiement"
    echo "📅 Dernière mise à jour du build: $(stat -c %y .next 2>/dev/null || echo 'Build non trouvé')"
    echo "📁 Répertoire: $(pwd)"
    echo "👤 Utilisateur: $(whoami)"
    echo "🖥️  Hostname: $(hostname)"
    
    echo ""
    echo "🔄 Pour actualiser: ./monitor.sh"
    echo "📊 Pour PM2 monitoring: pm2 monit"
    echo "📋 Pour redémarrer: pm2 restart skullking"
}

# Exécution du monitoring
main
