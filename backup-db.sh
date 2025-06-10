#!/bin/bash

# 💾 Script de sauvegarde automatique - Skull King
# Ce script peut être ajouté au crontab pour des sauvegardes automatiques

set -e

# Variables de configuration
APP_DIR="/home/pi/skullking"
BACKUP_DIR="/home/pi/backups"
LOG_FILE="/home/pi/logs/backup.log"
MAX_BACKUPS=14  # Garder 14 jours de sauvegardes

# Fonction de log avec timestamp
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Créer les dossiers nécessaires
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Début de la sauvegarde
log_with_timestamp "🏴‍☠️ Début de la sauvegarde automatique Skull King"

# Vérifier si la base de données existe
DB_FILE="$APP_DIR/prisma/db/production.db"
if [ ! -f "$DB_FILE" ]; then
    log_with_timestamp "❌ Base de données non trouvée : $DB_FILE"
    exit 1
fi

# Créer le nom du fichier de sauvegarde
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/skull_king_auto_backup_$DATE.db"

# Effectuer la sauvegarde
if cp "$DB_FILE" "$BACKUP_FILE"; then
    # Calculer la taille
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_with_timestamp "✅ Sauvegarde réussie : $(basename "$BACKUP_FILE") ($SIZE)"
    
    # Compresser la sauvegarde pour économiser l'espace
    if command -v gzip >/dev/null 2>&1; then
        gzip "$BACKUP_FILE"
        COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
        log_with_timestamp "📦 Sauvegarde compressée : $(basename "$BACKUP_FILE").gz ($COMPRESSED_SIZE)"
    fi
else
    log_with_timestamp "❌ Échec de la sauvegarde"
    exit 1
fi

# Nettoyer les anciennes sauvegardes
log_with_timestamp "🧹 Nettoyage des anciennes sauvegardes (> $MAX_BACKUPS jours)"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "skull_king_auto_backup_*.db*" -mtime +$MAX_BACKUPS -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    log_with_timestamp "🗑️  $DELETED_COUNT anciennes sauvegardes supprimées"
else
    log_with_timestamp "ℹ️  Aucune ancienne sauvegarde à supprimer"
fi

# Vérifier l'espace disque disponible
DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log_with_timestamp "⚠️  Attention : Espace disque faible ($DISK_USAGE% utilisé)"
fi

# Résumé
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "skull_king_auto_backup_*.db*" | wc -l)
log_with_timestamp "📊 Résumé : $BACKUP_COUNT sauvegardes au total"

log_with_timestamp "✅ Sauvegarde automatique terminée"

# Optionnel : Envoyer une notification (décommentez si vous avez configuré un système de notification)
# echo "Sauvegarde Skull King terminée sur $(hostname) à $(date)" | mail -s "Sauvegarde OK" votre-email@domain.com
