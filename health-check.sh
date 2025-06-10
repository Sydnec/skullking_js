#!/bin/bash

# 🩺 Script de vérification de santé - Skull King
# Ce script vérifie que l'application fonctionne correctement

set -e

# Variables de configuration
APP_DIR="/home/pi/skullking"
LOG_FILE="/home/pi/logs/health-check.log"
SERVICE_NAME="skull-king"
HEALTH_URL="http://localhost:3000/api/health"

# Fonction de log avec timestamp
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Créer le dossier de logs
mkdir -p "$(dirname "$LOG_FILE")"

# Début du check
log_with_timestamp "🩺 Début du health check Skull King"

# Variables de statut
ALL_OK=true
ERRORS=()

# 1. Vérifier si PM2 tourne
if ! command -v pm2 >/dev/null 2>&1; then
    ERRORS+=("PM2 non installé")
    ALL_OK=false
else
    log_with_timestamp "✅ PM2 installé"
fi

# 2. Vérifier si le service est en cours d'exécution
if pm2 list | grep -q "$SERVICE_NAME.*online"; then
    log_with_timestamp "✅ Service $SERVICE_NAME en cours d'exécution"
else
    ERRORS+=("Service $SERVICE_NAME non actif")
    ALL_OK=false
fi

# 3. Vérifier la réponse HTTP
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    log_with_timestamp "✅ Application répond correctement (HTTP $HTTP_STATUS)"
    
    # Vérifier le contenu de la réponse
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" || echo "{}")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        log_with_timestamp "✅ Status de santé : healthy"
    else
        ERRORS+=("Status de santé non healthy")
        ALL_OK=false
    fi
else
    ERRORS+=("Application ne répond pas (HTTP $HTTP_STATUS)")
    ALL_OK=false
fi

# 4. Vérifier l'espace disque
DISK_USAGE=$(df -h "$APP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    log_with_timestamp "✅ Espace disque OK ($DISK_USAGE% utilisé)"
else
    ERRORS+=("Espace disque critique ($DISK_USAGE% utilisé)")
    ALL_OK=false
fi

# 5. Vérifier la mémoire disponible
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
if [ "$(echo "$MEMORY_USAGE < 90" | bc -l)" = "1" ]; then
    log_with_timestamp "✅ Mémoire OK (${MEMORY_USAGE}% utilisée)"
else
    ERRORS+=("Mémoire critique (${MEMORY_USAGE}% utilisée)")
    ALL_OK=false
fi

# 6. Vérifier la température du CPU (Raspberry Pi)
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP / 1000))
    if [ $TEMP_C -lt 75 ]; then
        log_with_timestamp "✅ Température CPU OK (${TEMP_C}°C)"
    else
        ERRORS+=("Température CPU élevée (${TEMP_C}°C)")
        ALL_OK=false
    fi
fi

# 7. Vérifier la base de données
DB_FILE="$APP_DIR/prisma/db/production.db"
if [ -f "$DB_FILE" ]; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    log_with_timestamp "✅ Base de données présente ($DB_SIZE)"
    
    # Vérifier que la base n'est pas corrompue (basique)
    if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
        log_with_timestamp "✅ Intégrité de la base de données OK"
    else
        ERRORS+=("Base de données potentiellement corrompue")
        ALL_OK=false
    fi
else
    ERRORS+=("Base de données non trouvée")
    ALL_OK=false
fi

# 8. Vérifier les logs d'erreur récents
ERROR_COUNT=$(pm2 logs "$SERVICE_NAME" --err --lines 100 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l || echo "0")
if [ "$ERROR_COUNT" -lt 5 ]; then
    log_with_timestamp "✅ Peu d'erreurs récentes ($ERROR_COUNT)"
else
    ERRORS+=("Nombreuses erreurs récentes ($ERROR_COUNT)")
    ALL_OK=false
fi

# Résultat final
echo ""
if [ "$ALL_OK" = true ]; then
    log_with_timestamp "🎉 Health check réussi - Tout fonctionne correctement !"
    exit 0
else
    log_with_timestamp "❌ Health check échoué - Problèmes détectés :"
    for error in "${ERRORS[@]}"; do
        log_with_timestamp "   • $error"
    done
    
    # Optionnel : Tenter un redémarrage automatique
    if [ "${1:-}" = "--auto-restart" ]; then
        log_with_timestamp "🔄 Tentative de redémarrage automatique..."
        pm2 restart "$SERVICE_NAME"
        sleep 10
        
        # Re-vérifier après redémarrage
        if curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -q "200"; then
            log_with_timestamp "✅ Redémarrage réussi"
            exit 0
        else
            log_with_timestamp "❌ Redémarrage échoué"
            exit 1
        fi
    fi
    
    exit 1
fi
