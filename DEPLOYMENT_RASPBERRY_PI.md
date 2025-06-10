# 🍓 Guide de Déploiement Raspberry Pi - Skull King

## 📋 Prérequis

### Sur votre Raspberry Pi
- Raspberry Pi 3B+ ou plus récent
- Raspberry Pi OS (64-bit recommandé)
- Node.js 18+ 
- Git
- PM2 (gestionnaire de processus)
- Accès SSH ou clavier/souris

### Sur votre machine de développement
- Git
- Accès réseau au Raspberry Pi

## 🔧 Installation sur Raspberry Pi

### 1. Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Installation de Node.js
```bash
# Installation via NodeSource (recommandé)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérification
node --version
npm --version
```

### 3. Installation de PM2
```bash
sudo npm install -g pm2
```

### 4. Installation de Git (si pas déjà installé)
```bash
sudo apt install git -y
```

## 📦 Déploiement de l'application

### 1. Cloner le repository
```bash
cd /home/pi
git clone <URL_DE_VOTRE_REPO> skullking
cd skullking
```

### 2. Installation des dépendances
```bash
npm install
```

### 3. Configuration de la base de données
```bash
# Créer le fichier de base de données
mkdir -p prisma/db

# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:push
```

### 4. Configuration des variables d'environnement
```bash
# Créer le fichier .env
cp .env.example .env
```

Puis éditer le fichier `.env` :
```bash
DATABASE_URL="file:./prisma/db/production.db"
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=http://YOUR_PI_IP:3000
```

### 5. Build de l'application
```bash
npm run build
```

### 6. Configuration PM2
```bash
# Démarrer l'application avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

## 🌐 Configuration réseau

### 1. Obtenir l'IP du Raspberry Pi
```bash
ip addr show | grep inet
```

### 2. Configuration du firewall (optionnel)
```bash
# Installer ufw si pas déjà fait
sudo apt install ufw -y

# Autoriser SSH
sudo ufw allow ssh

# Autoriser le port de l'application
sudo ufw allow 3000

# Activer le firewall
sudo ufw enable
```

### 3. Accès depuis le réseau local
- L'application sera accessible via `http://IP_DU_PI:3000`
- Remplacez `IP_DU_PI` par l'adresse IP de votre Raspberry Pi

## 🔄 Scripts de maintenance

### Mise à jour de l'application
```bash
#!/bin/bash
cd /home/pi/skullking
git pull origin main
npm install
npm run build
pm2 restart skull-king
```

### Sauvegarde de la base de données
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /home/pi/skullking/prisma/db/production.db /home/pi/backups/skull_king_$DATE.db
```

### Monitoring des logs
```bash
# Voir les logs en temps réel
pm2 logs skull-king

# Voir les métriques
pm2 monit
```

## 🛠️ Dépannage

### Application ne démarre pas
```bash
# Vérifier les logs
pm2 logs skull-king

# Vérifier le statut
pm2 status

# Redémarrer l'application
pm2 restart skull-king
```

### Problèmes de base de données
```bash
# Réinitialiser la base de données
cd /home/pi/skullking
npm run db:reset

# Recréer les tables
npm run db:push
```

### Problèmes de permissions
```bash
# Donner les bonnes permissions au dossier
sudo chown -R pi:pi /home/pi/skullking
chmod +x /home/pi/skullking/scripts/*.sh
```

## 📱 Accès depuis l'extérieur (optionnel)

### Configuration du routeur
1. Connectez-vous à votre routeur
2. Configurez le port forwarding :
   - Port externe : 8080 (ou autre)
   - Port interne : 3000
   - IP : Adresse IP du Raspberry Pi

### Nom de domaine gratuit (optionnel)
- Utilisez un service comme No-IP ou DuckDNS
- Configurez un script de mise à jour automatique de l'IP

## 🔐 Sécurité

### Recommandations
- Changez le mot de passe par défaut du Pi
- Utilisez des clés SSH au lieu de mots de passe
- Configurez un firewall
- Mettez à jour régulièrement le système
- Utilisez HTTPS en production (avec Let's Encrypt + nginx)

### Configuration HTTPS avec nginx (avancé)
```bash
# Installation nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Configuration du reverse proxy
sudo nano /etc/nginx/sites-available/skullking

# Contenu du fichier :
server {
    listen 80;
    server_name YOUR_DOMAIN.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Activer le site
sudo ln -s /etc/nginx/sites-available/skullking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d YOUR_DOMAIN.com
```
