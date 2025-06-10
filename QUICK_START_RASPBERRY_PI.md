# 🍓 Démarrage Rapide - Skull King sur Raspberry Pi

## 🚀 Installation en une commande

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy-raspberry-pi.sh | bash
```

## 📋 Étapes manuelles (si vous préférez)

### 1. Préparer votre Raspberry Pi
```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PM2
sudo npm install -g pm2

# Installer Git
sudo apt install git -y
```

### 2. Cloner et déployer
```bash
# Cloner le projet
git clone <URL_DE_VOTRE_REPO> /home/pi/skullking
cd /home/pi/skullking

# Rendre les scripts exécutables
chmod +x *.sh

# Exécuter le déploiement
./deploy-raspberry-pi.sh
```

### 3. Accéder à l'application
- **Local** : http://localhost:3000
- **Réseau** : http://IP_DU_PI:3000

## 🛠️ Commandes utiles

### Gestion de l'application
```bash
# Script de maintenance interactif
./maintenance-raspberry-pi.sh

# Mise à jour de l'application
./update-raspberry-pi.sh

# Voir les logs
pm2 logs skull-king

# Redémarrer
pm2 restart skull-king

# Monitoring
pm2 monit
```

### Obtenir l'IP du Raspberry Pi
```bash
hostname -I | awk '{print $1}'
```

### Tester l'application
```bash
curl http://localhost:3000/api/health
```

## 🔧 Configuration

### Variables d'environnement importantes
Éditez `/home/pi/skullking/.env` :
```bash
DATABASE_URL="file:./prisma/db/production.db"
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=http://192.168.1.100:3000  # Remplacez par l'IP de votre Pi
```

### Ports utilisés
- **3000** : Application web (HTTP)
- **22** : SSH (pour la maintenance)

## 🚨 Dépannage rapide

### L'application ne démarre pas
```bash
# Vérifier les logs
pm2 logs skull-king

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
# Sauvegarder l'ancienne
cp /home/pi/skullking/prisma/db/production.db /home/pi/backups/

# Recréer
cd /home/pi/skullking
rm prisma/db/production.db
npm run db:push
pm2 restart skull-king
```

## 📱 Accès mobile

Pour jouer depuis vos téléphones/tablettes sur le même réseau WiFi :
1. Trouvez l'IP de votre Raspberry Pi : `hostname -I`
2. Ouvrez : `http://IP_DU_PI:3000` dans votre navigateur mobile

## 🔐 Sécurisation (optionnel)

### Accès depuis Internet
```bash
# Installer nginx (reverse proxy)
sudo apt install nginx -y

# Configurer HTTPS avec Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
```

### Configuration du routeur
1. Port forwarding : 80/443 → IP_DU_PI:3000
2. DNS dynamique (No-IP, DuckDNS, etc.)

## 📊 Performance

### Recommandations matériel
- **Minimum** : Raspberry Pi 3B+ (1GB RAM)
- **Recommandé** : Raspberry Pi 4 (2GB+ RAM)
- **Stockage** : Carte SD Class 10 (16GB+)

### Optimisations
```bash
# Augmenter la swap si RAM limitée
sudo dphys-swapfile swapoff
sudo sed -i 's/#CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## 🔄 Maintenance automatique

### Sauvegarde automatique (crontab)
```bash
# Ouvrir crontab
crontab -e

# Ajouter cette ligne pour une sauvegarde quotidienne à 2h
0 2 * * * /home/pi/skullking/scripts/backup-db.sh
```

### Redémarrage automatique
```bash
# Redémarrer le Pi tous les dimanches à 3h (optionnel)
0 3 * * 0 sudo reboot
```

## 📞 Support

- **Documentation complète** : `DEPLOYMENT_RASPBERRY_PI.md`
- **Logs** : `pm2 logs skull-king`
- **Monitoring** : `pm2 monit`
- **Maintenance** : `./maintenance-raspberry-pi.sh`
