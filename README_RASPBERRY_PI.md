# 🍓 Skull King - Déploiement Raspberry Pi

![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-A22846?style=for-the-badge&logo=Raspberry%20Pi&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

Transformez votre Raspberry Pi en serveur de jeu Skull King ! Guide complet pour un déploiement professionnel avec auto-hébergement.

## 🚀 Installation Rapide

### Option 1 : Installation automatique (recommandée)
```bash
# Télécharger et exécuter le script de déploiement
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy-raspberry-pi.sh | bash
```

### Option 2 : Installation manuelle
```bash
# 1. Cloner le projet
git clone <URL_DE_VOTRE_REPO> /home/pi/skullking
cd /home/pi/skullking

# 2. Rendre les scripts exécutables
chmod +x *.sh

# 3. Lancer le déploiement
./deploy-raspberry-pi.sh
```

## 📋 Prérequis

### Matériel recommandé
- **Raspberry Pi 4** (2GB RAM minimum, 4GB recommandé)
- **Carte microSD** Class 10, 32GB minimum
- **Alimentation** 5V 3A officielle
- **Connexion réseau** Ethernet ou WiFi stable

### Logiciels
- **Raspberry Pi OS** (64-bit recommandé)
- **Node.js 18+** (installé automatiquement)
- **Git** (installé automatiquement)

## 🎯 Fonctionnalités du déploiement

### ✅ Installation automatisée
- Configuration complète en une commande
- Installation des dépendances système
- Configuration de la base de données SQLite
- Paramétrage des variables d'environnement

### ✅ Gestion des processus
- **PM2** : Monitoring facile et interface graphique
- **systemd** : Intégration native et sécurité renforcée
- Redémarrage automatique en cas de crash
- Démarrage automatique au boot

### ✅ Maintenance automatisée
- Sauvegarde quotidienne de la base de données
- Health check toutes les 5 minutes
- Nettoyage automatique des logs
- Monitoring des ressources système

### ✅ Sécurité
- Firewall configuré automatiquement
- Variables d'environnement sécurisées
- Permissions système appropriées
- Isolation des processus

### ✅ Performance optimisée
- Configuration spécifique Raspberry Pi
- Compression activée
- Cache optimisé
- Gestion efficace de la mémoire

## 📁 Scripts disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy-raspberry-pi.sh` | Installation complète | `./deploy-raspberry-pi.sh` |
| `update-raspberry-pi.sh` | Mise à jour de l'application | `./update-raspberry-pi.sh` |
| `maintenance-raspberry-pi.sh` | Interface de maintenance | `./maintenance-raspberry-pi.sh` |
| `configure-raspberry-pi.sh` | Configuration avancée | `./configure-raspberry-pi.sh` |
| `health-check.sh` | Vérification de santé | `./health-check.sh` |
| `backup-db.sh` | Sauvegarde manuelle | `./backup-db.sh` |

## 🌐 Accès à l'application

Après le déploiement, votre application sera accessible :

### Réseau local
```
http://IP_DU_RASPBERRY_PI:3000
```

### Avec nginx (optionnel)
```
http://IP_DU_RASPBERRY_PI
```

### Avec HTTPS (optionnel)
```
https://VOTRE_DOMAINE.com
```

Pour trouver l'IP de votre Raspberry Pi :
```bash
hostname -I | awk '{print $1}'
```

## 🛠️ Gestion quotidienne

### Commandes essentielles

#### Avec PM2
```bash
# Statut de l'application
pm2 status

# Voir les logs
pm2 logs skull-king

# Redémarrer
pm2 restart skull-king

# Monitoring en temps réel
pm2 monit
```

#### Avec systemd
```bash
# Statut de l'application
sudo systemctl status skull-king

# Voir les logs
sudo journalctl -u skull-king -f

# Redémarrer
sudo systemctl restart skull-king
```

### Interface de maintenance
```bash
cd /home/pi/skullking
./maintenance-raspberry-pi.sh
```

Menu interactif avec :
- 📊 Statut des services
- 📋 Visualisation des logs
- 🔄 Redémarrage/Arrêt/Démarrage
- 💾 Gestion des sauvegardes
- 🧹 Nettoyage
- 📈 Monitoring temps réel
- 🔧 Diagnostic système

## 📊 Monitoring et logs

### Fichiers de logs
```bash
# Logs de l'application
/home/pi/logs/skull-king-*.log

# Logs de sauvegarde
/home/pi/logs/backup.log

# Logs de health check
/home/pi/logs/health-check.log
```

### Métriques système
```bash
# Monitoring interactif
htop

# Température CPU
vcgencmd measure_temp

# Usage disque
df -h

# Mémoire
free -h
```

## 💾 Sauvegardes

### Automatiques
- **Quotidienne** : 2h du matin
- **Rétention** : 14 jours
- **Compression** : Automatique avec gzip
- **Localisation** : `/home/pi/backups/`

### Manuelles
```bash
# Sauvegarde immédiate
./backup-db.sh

# Lister les sauvegardes
ls -la /home/pi/backups/

# Restaurer une sauvegarde
./maintenance-raspberry-pi.sh
# Puis menu → Gérer les sauvegardes → Restaurer
```

## 🔄 Mises à jour

### Mise à jour de l'application
```bash
cd /home/pi/skullking
./update-raspberry-pi.sh
```

Le script effectue automatiquement :
1. Sauvegarde de la base de données
2. Récupération du nouveau code
3. Mise à jour des dépendances
4. Mise à jour de la base de données
5. Rebuild de l'application
6. Redémarrage des services
7. Test de fonctionnement

### Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

## 🔧 Configuration avancée

### Reverse proxy avec nginx
```bash
./configure-raspberry-pi.sh
```

Permet de :
- Utiliser le port 80 standard
- Configurer HTTPS avec Let's Encrypt
- Améliorer les performances
- Gérer plusieurs applications

### Variables d'environnement

Éditez `/home/pi/skullking/.env` :

```bash
# Base de données
DATABASE_URL="file:./prisma/db/production.db"

# Environnement
NODE_ENV=production
PORT=3000

# CORS (remplacez par votre IP)
ALLOWED_ORIGINS=http://192.168.1.100:3000

# Sécurité (générez des clés uniques !)
SESSION_SECRET=your-secure-session-secret
JWT_SECRET=your-secure-jwt-secret

# Performance
MAX_CONCURRENT_GAMES=20
SOCKET_PING_TIMEOUT=60000
```

## 🌍 Accès depuis Internet (optionnel)

### Configuration du routeur
1. Port forwarding : `80` et `443` → IP du Raspberry Pi
2. IP statique pour le Pi (DHCP reservation)

### DNS dynamique
Services gratuits :
- [No-IP](https://www.noip.com/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu](https://www.dynu.com/)

### HTTPS automatique
```bash
./configure-raspberry-pi.sh
# Choisir l'option HTTPS avec Let's Encrypt
```

## 🚨 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
pm2 logs skull-king
# ou
sudo journalctl -u skull-king -f

# Vérifier la configuration
cat /home/pi/skullking/.env

# Redémarrer complètement
pm2 delete skull-king
cd /home/pi/skullking
pm2 start ecosystem.config.js --env production
```

### Impossible d'accéder depuis le réseau
```bash
# Vérifier le firewall
sudo ufw status

# Ouvrir le port si nécessaire
sudo ufw allow 3000

# Vérifier que l'application écoute sur toutes les interfaces
netstat -tlnp | grep 3000
```

### Base de données corrompue
```bash
# Utiliser une sauvegarde récente
./maintenance-raspberry-pi.sh
# Menu → Gérer les sauvegardes → Restaurer

# Ou recréer complètement
cd /home/pi/skullking
rm -f prisma/db/production.db
npm run db:push
pm2 restart skull-king
```

### Performance lente
```bash
# Vérifier les ressources
./maintenance-raspberry-pi.sh
# Menu → Diagnostic système

# Augmenter la swap si nécessaire
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## 📞 Support et aide

### Documentation
- **Guide complet** : `DEPLOYMENT_RASPBERRY_PI.md`
- **Démarrage rapide** : `QUICK_START_RASPBERRY_PI.md`
- **README principal** : `README.md`

### Commandes d'aide
```bash
# Health check avec diagnostic
./health-check.sh

# Maintenance interactive
./maintenance-raspberry-pi.sh

# Informations système
./configure-raspberry-pi.sh
```

### Logs utiles
```bash
# Logs de l'application
pm2 logs skull-king

# Logs système
sudo journalctl -xe

# Logs du serveur web (si nginx)
sudo tail -f /var/log/nginx/error.log
```

## 🎮 Profitez du jeu !

Une fois le déploiement terminé :

1. **Ouvrez votre navigateur** sur `http://IP_DU_PI:3000`
2. **Créez une partie** et partagez le code avec vos amis
3. **Jouez depuis n'importe où** sur votre réseau local
4. **Configurez l'accès Internet** pour jouer depuis n'importe où

---

<div align="center">

**🏴‍☠️ Bon jeu avec Skull King ! ⚔️**

[![Raspberry Pi](https://img.shields.io/badge/Made%20for-Raspberry%20Pi-C51A4A?style=for-the-badge&logo=Raspberry-Pi)](https://www.raspberrypi.org/)

</div>
