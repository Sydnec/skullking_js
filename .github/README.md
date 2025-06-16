# 🏴‍☠️ Skull King - CI/CD Documentation

## Vue d'ensemble

Ce projet utilise GitHub Actions pour automatiser le processus de CI/CD, remplaçant le script `sk` manuel par des workflows automatisés et robustes.

## Structure des Workflows

### 🔍 CI - Tests & Validation (`ci.yml`)
**Déclencheurs:** Push sur toutes les branches, Pull Requests
- ✅ Tests de linting (ESLint)
- ✅ Vérification des types TypeScript
- ✅ Build de l'application
- ✅ Génération du client Prisma
- ✅ Audit de sécurité

### 🚀 CD - Deploy to Production (`deploy.yml`)
**Déclencheurs:** Push sur `main`, déclenchement manuel
- 🏥 Vérification de l'état de l'application
- 📋 Sauvegarde automatique (base de données + logs)
- 🛑 Arrêt gracieux de l'application
- 📦 Installation des dépendances
- 🏗️ Build de l'application
- 🗄️ Migration de la base de données
- 🚀 Redémarrage avec PM2
- 🏥 Vérification post-déploiement
- 🔄 Rollback automatique en cas d'échec

### 🛠️ Maintenance & Operations (`maintenance.yml`)
**Déclencheurs:** Planifié (quotidien 6h UTC), déclenchement manuel
- 🏥 **Health Check:** Contrôle de santé complet
- 🔄 **Restart:** Redémarrage de l'application
- 🔄 **Update:** Mise à jour complète
- 🗄️ **Backup:** Sauvegarde de la base de données
- 🧹 **Cleanup Logs:** Nettoyage des logs
- 🔄 **Reset App:** Réinitialisation complète

### 🔥 Hotfix Deploy (`hotfix.yml`)
**Déclencheurs:** Push sur branches `hotfix/*`, déclenchement manuel
- 🚨 Déploiement d'urgence rapide
- 🗄️ Sauvegarde d'urgence
- ⚡ Build et déploiement accéléré
- 🔄 Rollback automatique en cas d'échec

## Configuration Requise

### 1. Self-hosted Runner
```bash
# Installation du runner GitHub Actions
./config.sh --url https://github.com/VOTRE_USERNAME/skullking_js --token VOTRE_TOKEN
./run.sh
```

### 2. Environment Secrets
Configurez dans GitHub > Settings > Environments > production :
- Variables d'environnement nécessaires
- Restrictions de déploiement (optionnel)

### 3. Permissions
Le runner doit avoir accès à :
- Node.js et npm
- PM2
- Base de données Prisma
- Répertoire du projet

## Utilisation

### Déploiement Automatique
```bash
# Push sur main déclenche automatiquement le déploiement
git push origin main
```

### Déploiement Manuel
1. Aller dans Actions > Deploy to Production
2. Cliquer sur "Run workflow"
3. Choisir les options si nécessaire

### Maintenance
1. Aller dans Actions > Maintenance & Operations
2. Choisir l'opération à effectuer :
   - `health-check` : Contrôle de santé
   - `restart` : Redémarrage
   - `update` : Mise à jour
   - `backup` : Sauvegarde
   - `cleanup-logs` : Nettoyage des logs
   - `reset-app` : Réinitialisation

### Hotfix d'Urgence
```bash
# Créer une branche hotfix
git checkout -b hotfix/fix-critical-bug
# Faire les modifications
git commit -m "fix: critical bug"
git push origin hotfix/fix-critical-bug
# Le déploiement se déclenche automatiquement
```

## Comparaison avec le Script `sk`

| Commande `sk` | Workflow GitHub | Avantages |
|---------------|-----------------|-----------|
| `sk deploy` | Deploy workflow | Automatique, traçabilité, rollback |
| `sk update` | Maintenance (update) | Sauvegarde automatique, vérifications |
| `sk monitor` | Maintenance (health-check) | Planifié, notifications |
| `sk restart` | Maintenance (restart) | Logs centralisés, vérifications |
| `sk reset` | Maintenance (reset-app) | Confirmations, sauvegardes |

## Avantages du CI/CD

### ✅ Automatisation
- Déploiement automatique sur `main`
- Tests automatiques sur toutes les branches
- Maintenance planifiée

### ✅ Sécurité
- Vérifications de santé avant/après déploiement
- Sauvegardes automatiques
- Rollback en cas d'échec

### ✅ Traçabilité
- Historique complet des déploiements
- Logs centralisés
- Notifications de statut

### ✅ Fiabilité
- Tests systématiques
- Déploiements cohérents
- Récupération automatique d'erreurs

## Monitoring

### Logs GitHub Actions
- Accessibles dans l'onglet Actions
- Historique complet des exécutions
- Détails des erreurs et succès

### Intégration PM2
- Status PM2 inclus dans les rapports
- Logs PM2 intégrés aux workflows
- Redémarrage automatique

### Alertes
- Échec de déploiement
- Problèmes de santé de l'application
- Ressources système critiques

## Dépannage

### Échec de Déploiement
1. Vérifier les logs dans Actions
2. Contrôler le status PM2 : `pm2 list`
3. Vérifier l'API : `curl http://localhost:3000/api/health`

### Runner Hors Ligne
1. Redémarrer le service runner
2. Vérifier la connectivité GitHub
3. Reconfigurer si nécessaire

### Base de Données Corrompue
1. Utiliser les sauvegardes automatiques
2. Ou déclencher un reset via Maintenance workflow

## Prochaines Améliorations

- [ ] Notifications Slack/Discord
- [ ] Tests d'intégration automatisés
- [ ] Métriques de performance
- [ ] Déploiement multi-environnement
- [ ] Pipeline de tests de charge

---

🏴‍☠️ **Skull King CI/CD** - Automatisation complète pour une navigation sans souci !
