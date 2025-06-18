#!/bin/bash

# Script de renouvellement automatique des certificats SSL pour DuckDNS
# À placer dans un cron job pour s'exécuter automatiquement

set -e

DOMAIN="skullking-api.duckdns.org"
LOG_FILE="/var/log/ssl-renewal.log"
APP_NAME="skullking-backend"

# Fonction de logging
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> $LOG_FILE
}

log_message "=== Début du processus de renouvellement SSL ==="

# Vérification de l'existence du certificat
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    log_message "ERREUR: Certificat non trouvé pour $DOMAIN"
    exit 1
fi

# Vérification de la date d'expiration (renouveler si moins de 30 jours restants)
EXPIRY_DATE=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

log_message "Certificat expire dans $DAYS_UNTIL_EXPIRY jours"

if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
    log_message "Certificat encore valide pour plus de 30 jours, renouvellement non nécessaire"
    exit 0
fi

log_message "Renouvellement nécessaire (moins de 30 jours restants)"

# Tentative de renouvellement
if sudo certbot renew --quiet --no-self-upgrade --deploy-hook "systemctl reload nginx"; then
    log_message "✅ Certificats renouvelés avec succès"
    
    # Redémarrer l'application Node.js avec PM2 si elle existe
    if command -v pm2 &> /dev/null && pm2 list | grep -q "$APP_NAME"; then
        pm2 restart $APP_NAME
        log_message "✅ Application Node.js redémarrée"
    else
        log_message "⚠️  Application PM2 '$APP_NAME' non trouvée, redémarrage manuel requis"
    fi
    
    log_message "✅ Processus de renouvellement terminé avec succès"
else
    log_message "❌ Échec du renouvellement des certificats"
    # Optionnel : envoyer une notification (email, webhook, etc.)
    exit 1
fi

log_message "=== Fin du processus de renouvellement SSL ==="
