# 🏴‍☠️ Skull King - Guide de Production

## 🚀 Déploiement rapide

L'application est maintenant déployée en production sur votre Raspberry Pi !

### 📍 Accès à l'application

- **Local**: http://localhost:3000
- **Réseau local**: http://192.168.1.151:3000 (ou http://192.168.1.151 si port 80 redirigé)

### 🛠️ Commandes essentielles

```bash
# Monitoring complet
./monitor.sh

# Gestion PM2
pm2 status           # Voir le statut
pm2 restart skullking # Redémarrer
pm2 stop skullking   # Arrêter
pm2 logs skullking   # Voir les logs
pm2 monit           # Interface de monitoring

# Déploiement/Mise à jour
./deploy.sh         # Déploiement complet
```

### 📊 Monitoring

- **Script de monitoring**: `./monitor.sh`
- **PM2 monitoring**: `pm2 monit`
- **Logs en temps réel**: `pm2 logs skullking`
- **API de santé**: http://localhost:3000/api/health

### 🔧 Configuration

- **Environnement**: `.env.production`
- **PM2**: Application configurée pour démarrer automatiquement
- **Logs**: `./logs/` (err.log, out.log, combined.log)
- **Base de données**: `./prisma/db/production.db`

### 🔄 Redémarrage automatique

PM2 est configuré pour :
- Redémarrer automatiquement en cas de crash
- Démarrer au boot du système
- Limiter l'utilisation mémoire (512MB pour Raspberry Pi)

### 🔒 Sécurité

⚠️ **IMPORTANT**: Changez les clés secrètes dans `.env.production` :
```bash
SESSION_SECRET=votre-clé-sécurisée-ici
JWT_SECRET=votre-autre-clé-sécurisée-ici
```

### 🌐 Accès réseau

L'application est configurée pour accepter les connexions depuis :
- localhost (127.0.0.1)
- IP locale (192.168.1.151)
- Port 3000 (redirigé depuis le port 80)

### 📈 Performance

Configuration optimisée pour Raspberry Pi :
- Mémoire limitée à 1GB
- Nettoyage automatique des salles inactives
- Compression activée
- Rate limiting configuré

### 🆘 Dépannage

1. **Application ne démarre pas**:
   ```bash
   pm2 logs skullking
   ```

2. **Erreur de base de données**:
   ```bash
   NODE_ENV=production npx prisma db push
   ```

3. **Problème de build**:
   ```bash
   npm run build
   ```

4. **Redéploiement complet**:
   ```bash
   ./deploy.sh
   ```

### 📝 Logs

Les logs sont disponibles dans :
- PM2: `pm2 logs skullking`
- Fichiers: `./logs/err.log`, `./logs/out.log`
- Système: `journalctl -u pm2-sydnec`

---

🎮 **Votre application Skull King est prête !** 
Partagez l'IP de votre Raspberry Pi avec vos amis pour jouer ensemble !
