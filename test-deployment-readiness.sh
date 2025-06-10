#!/bin/bash

# 🧪 Script de test pré-déploiement - Skull King
# Ce script vérifie que tout est prêt pour le déploiement sur Raspberry Pi

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALL_OK=true
ISSUES=()

echo -e "${GREEN}🧪 Test pré-déploiement Skull King${NC}"
echo ""

# Test 1: Vérifier les fichiers essentiels
log_info "Vérification des fichiers essentiels..."

REQUIRED_FILES=(
    "package.json"
    "server.js"
    "ecosystem.config.js"
    "prisma/schema.prisma"
    ".env.example"
    "deploy-raspberry-pi.sh"
    "update-raspberry-pi.sh"
    "maintenance-raspberry-pi.sh"
    "health-check.sh"
    "backup-db.sh"
    "configure-raspberry-pi.sh"
    "skull-king.service"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        log_success "Fichier présent : $file"
    else
        log_error "Fichier manquant : $file"
        ISSUES+=("Fichier manquant : $file")
        ALL_OK=false
    fi
done

# Test 2: Vérifier les permissions des scripts
log_info "Vérification des permissions des scripts..."

SCRIPTS=(
    "deploy-raspberry-pi.sh"
    "update-raspberry-pi.sh"
    "maintenance-raspberry-pi.sh"
    "health-check.sh"
    "backup-db.sh"
    "configure-raspberry-pi.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -x "$SCRIPT_DIR/$script" ]; then
        log_success "Script exécutable : $script"
    else
        log_warning "Script non exécutable : $script"
        chmod +x "$SCRIPT_DIR/$script" 2>/dev/null || true
        if [ -x "$SCRIPT_DIR/$script" ]; then
            log_success "Permission corrigée : $script"
        else
            ISSUES+=("Impossible de rendre exécutable : $script")
            ALL_OK=false
        fi
    fi
done

# Test 3: Vérifier la syntaxe des scripts bash
log_info "Vérification de la syntaxe des scripts..."

for script in "${SCRIPTS[@]}"; do
    if bash -n "$SCRIPT_DIR/$script" 2>/dev/null; then
        log_success "Syntaxe correcte : $script"
    else
        log_error "Erreur de syntaxe : $script"
        ISSUES+=("Erreur de syntaxe dans : $script")
        ALL_OK=false
    fi
done

# Test 4: Vérifier package.json
log_info "Vérification de package.json..."

if command -v node >/dev/null 2>&1; then
    if node -e "JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/package.json', 'utf8'))" 2>/dev/null; then
        log_success "package.json valide"
        
        # Vérifier les scripts npm essentiels
        REQUIRED_SCRIPTS=("build" "start" "db:generate" "db:push")
        for npm_script in "${REQUIRED_SCRIPTS[@]}"; do
            if node -e "const pkg = JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/package.json', 'utf8')); console.log(pkg.scripts['$npm_script'] || 'MISSING')" | grep -q "MISSING"; then
                log_warning "Script npm manquant : $npm_script"
                ISSUES+=("Script npm manquant : $npm_script")
            else
                log_success "Script npm présent : $npm_script"
            fi
        done
    else
        log_error "package.json invalide"
        ISSUES+=("package.json invalide ou malformé")
        ALL_OK=false
    fi
else
    log_warning "Node.js non installé (normal sur machine de développement)"
fi

# Test 5: Vérifier le schéma Prisma
log_info "Vérification du schéma Prisma..."

if [ -f "$SCRIPT_DIR/prisma/schema.prisma" ]; then
    if grep -q "provider.*sqlite" "$SCRIPT_DIR/prisma/schema.prisma"; then
        log_success "Schéma Prisma configuré pour SQLite"
    else
        log_warning "Schéma Prisma non configuré pour SQLite"
        ISSUES+=("Schéma Prisma devrait utiliser SQLite pour Raspberry Pi")
    fi
    
    if grep -q "DATABASE_URL" "$SCRIPT_DIR/prisma/schema.prisma"; then
        log_success "Schéma Prisma utilise DATABASE_URL"
    else
        log_error "Schéma Prisma n'utilise pas DATABASE_URL"
        ISSUES+=("Schéma Prisma doit utiliser env(\"DATABASE_URL\")")
        ALL_OK=false
    fi
else
    log_error "Schéma Prisma manquant"
    ISSUES+=("Fichier prisma/schema.prisma manquant")
    ALL_OK=false
fi

# Test 6: Vérifier le fichier .env.example
log_info "Vérification du fichier .env.example..."

if [ -f "$SCRIPT_DIR/.env.example" ]; then
    REQUIRED_ENV_VARS=("DATABASE_URL" "NODE_ENV" "PORT")
    for env_var in "${REQUIRED_ENV_VARS[@]}"; do
        if grep -q "^#.*$env_var" "$SCRIPT_DIR/.env.example" || grep -q "^$env_var" "$SCRIPT_DIR/.env.example"; then
            log_success "Variable d'environnement documentée : $env_var"
        else
            log_warning "Variable d'environnement non documentée : $env_var"
            ISSUES+=("Variable d'environnement $env_var non documentée dans .env.example")
        fi
    done
else
    log_error "Fichier .env.example manquant"
    ISSUES+=("Fichier .env.example manquant")
    ALL_OK=false
fi

# Test 7: Vérifier la configuration PM2
log_info "Vérification de la configuration PM2..."

if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
    if grep -q "skull-king" "$SCRIPT_DIR/ecosystem.config.js"; then
        log_success "Configuration PM2 contient le nom de l'application"
    else
        log_warning "Nom de l'application non trouvé dans ecosystem.config.js"
    fi
    
    if grep -q "server.js" "$SCRIPT_DIR/ecosystem.config.js"; then
        log_success "Configuration PM2 pointe vers server.js"
    else
        log_error "Configuration PM2 ne pointe pas vers server.js"
        ISSUES+=("ecosystem.config.js doit pointer vers server.js")
        ALL_OK=false
    fi
else
    log_error "Configuration PM2 manquante"
    ISSUES+=("Fichier ecosystem.config.js manquant")
    ALL_OK=false
fi

# Test 8: Vérifier la configuration systemd
log_info "Vérification de la configuration systemd..."

if [ -f "$SCRIPT_DIR/skull-king.service" ]; then
    if grep -q "server.js" "$SCRIPT_DIR/skull-king.service"; then
        log_success "Service systemd pointe vers server.js"
    else
        log_error "Service systemd ne pointe pas vers server.js"
        ISSUES+=("skull-king.service doit pointer vers server.js")
        ALL_OK=false
    fi
    
    if grep -q "User=pi" "$SCRIPT_DIR/skull-king.service"; then
        log_success "Service systemd configuré pour l'utilisateur pi"
    else
        log_warning "Service systemd non configuré pour l'utilisateur pi"
    fi
else
    log_error "Configuration systemd manquante"
    ISSUES+=("Fichier skull-king.service manquant")
    ALL_OK=false
fi

# Test 9: Vérifier les dépendances dans package.json
log_info "Vérification des dépendances essentielles..."

if [ -f "$SCRIPT_DIR/package.json" ] && command -v node >/dev/null 2>&1; then
    REQUIRED_DEPS=("@prisma/client" "next" "socket.io" "react" "prisma")
    for dep in "${REQUIRED_DEPS[@]}"; do
        if node -e "const pkg = JSON.parse(require('fs').readFileSync('$SCRIPT_DIR/package.json', 'utf8')); console.log(pkg.dependencies['$dep'] || pkg.devDependencies['$dep'] || 'MISSING')" | grep -q "MISSING"; then
            log_error "Dépendance manquante : $dep"
            ISSUES+=("Dépendance npm manquante : $dep")
            ALL_OK=false
        else
            log_success "Dépendance présente : $dep"
        fi
    done
fi

# Test 10: Vérifier les chemins dans les scripts
log_info "Vérification des chemins dans les scripts..."

PROBLEMATIC_PATHS=("/Users/" "/home/username" "C:\\" "\\Users\\")
for script in "${SCRIPTS[@]}"; do
    for path in "${PROBLEMATIC_PATHS[@]}"; do
        if grep -q "$path" "$SCRIPT_DIR/$script" 2>/dev/null; then
            log_warning "Chemin suspect trouvé dans $script : $path"
            ISSUES+=("Chemin potentiellement problématique dans $script")
        fi
    done
done

# Résumé final
echo ""
echo "=================================="
if [ "$ALL_OK" = true ]; then
    log_success "🎉 Tous les tests sont passés !"
    echo ""
    echo -e "${GREEN}✅ Votre projet est prêt pour le déploiement sur Raspberry Pi${NC}"
    echo ""
    echo -e "${BLUE}📋 Prochaines étapes :${NC}"
    echo "1. Transférez votre code sur le Raspberry Pi"
    echo "2. Exécutez : ./deploy-raspberry-pi.sh"
    echo "3. Suivez les instructions à l'écran"
    echo ""
    echo -e "${BLUE}📚 Documentation utile :${NC}"
    echo "• Guide complet : DEPLOYMENT_RASPBERRY_PI.md"
    echo "• Démarrage rapide : QUICK_START_RASPBERRY_PI.md"
    echo "• README Raspberry Pi : README_RASPBERRY_PI.md"
else
    log_error "❌ Des problèmes ont été détectés"
    echo ""
    echo -e "${RED}🚨 Problèmes à corriger :${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "${RED}   • $issue${NC}"
    done
    echo ""
    echo -e "${YELLOW}🔧 Corrigez ces problèmes avant le déploiement${NC}"
fi

echo ""
echo -e "${BLUE}🛠️  Commandes utiles après déploiement :${NC}"
echo "• Test de santé : ./health-check.sh"
echo "• Maintenance : ./maintenance-raspberry-pi.sh"
echo "• Mise à jour : ./update-raspberry-pi.sh"
echo "• Configuration avancée : ./configure-raspberry-pi.sh"

exit $([ "$ALL_OK" = true ] && echo 0 || echo 1)
