# 🏴‍☠️ Skull King - GitHub Actions Workflows

Écosystème CI/CD complet pour le projet Skull King avec déploiement automatisé, tests intégrés et contrôle qualité.

## 📋 Vue d'ensemble

| Workflow | Déclenchement | Description |
|----------|---------------|-------------|
| 🚀 **deploy.yml** | Push `main` / Manuel | Pipeline CI/CD complet avec déploiement |
| 🧪 **test.yml** | Push / PR / Quotidien | Suite de tests complète (unit, intégration, E2E) |
| 🔍 **quality.yml** | Push / PR / Hebdomadaire | Analyse qualité et sécurité |
| 📦 **release.yml** | Tags `v*.*.*` | Création automatique de releases |

## 🚀 Workflow Principal - `deploy.yml`

### Déclenchement
- **Automatique** : Push sur la branche `main`
- **Manuel** : Actions → "Deploy to Prod" → Run workflow

### Pipeline en 5 étapes

#### 1. 🧪 **Tests**
- Tests backend (Jest, coverage)
- Tests frontend (TypeScript, lint)
- Validation Prisma
- Audit sécurité

#### 2. 🏗️ **Build**
- Build backend optimisé
- Build frontend Next.js
- Génération assets statiques

#### 3. 🔍 **Code Quality**
- ESLint backend/frontend
- Prettier formatting
- TypeScript checks
- Audit dépendances

#### 4. 🚀 **Deploy**
- Déploiement via script `./sk deploy`
- Configuration Prisma
- Redémarrage PM2
- Health check API

#### 5. 📢 **Notify**
- Notification Discord du statut
- Rapport de déploiement
- Métriques performance

### Commandes de déploiement
```bash
# Backend uniquement (par défaut)
./sk deploy

# Fullstack (backend + frontend)
./sk deploy-full

# Avec tests complets
./sk deploy --test
```

## 🧪 Tests Automatisés - `test.yml`

### Types de tests

#### **Backend** 🔧
- Tests unitaires (Jest)
- Tests d'intégration API
- Couverture de code
- Lint ESLint
- Audit sécurité npm

#### **Frontend** 🎨
- Tests composants React
- Build production
- TypeScript validation
- Lint ESLint
- Audit sécurité npm

#### **Intégration** 🔗
- Tests API REST
- Tests WebSocket
- Health checks services
- Tests bout-en-bout

#### **E2E** 🎮
- Tests Playwright
- Scénarios utilisateur
- Screenshots erreurs
- Rapports visuels

#### **Performance** ⚡
- Tests charge API (autocannon)
- Analyse temps réponse
- Monitoring ressources

### Programmation
- **Quotidien** : 2h du matin (tests automatiques)
- **PR/Push** : Tests complets sur code changes

## 🔍 Contrôle Qualité - `quality.yml`

### Analyses de sécurité 🛡️
- **CodeQL** : Analyse statique sécurité
- **npm audit** : Vulnérabilités dépendances
- **License check** : Conformité licences

### Analyses statiques 🔍
- **ESLint** : Qualité code JavaScript/TypeScript
- **Prettier** : Formatage uniforme
- **TypeScript** : Validation types stricte

### Analyses performance ⚡
- **Bundle analyzer** : Taille assets frontend
- **Complexity analysis** : Complexité cyclomatique
- **Dependencies audit** : Dépendances obsolètes

### Documentation 📚
- **JSDoc coverage** : Couverture documentation
- **README completeness** : Vérification docs
- **API documentation** : Validation Swagger

### Programmation
- **Hebdomadaire** : Lundi 6h (analyse complète)
- **PR/Push** : Validation qualité sur changes

## 📦 Releases Automatiques - `release.yml`

### Déclenchement
Tags suivant le format semver : `v1.0.0`, `v1.2.3`, etc.

### Génération automatique
- **Changelog** : Commits depuis dernière release
- **Archives** : 
  - `skull-king-full-vX.X.X.tar.gz` (projet complet)
  - `skull-king-backend-vX.X.X.tar.gz` (backend seul)
- **Release notes** : Documentation installation
- **Assets** : Binaires téléchargeables

### Création release
```bash
# Créer un tag et pusher
git tag v1.0.0
git push origin v1.0.0

# La release sera créée automatiquement
```

## 🏗️ Architecture de Déploiement

```
GitHub Repository
       ↓
   GitHub Actions (Ubuntu)
       ↓ 
   Tests & Build & Quality
       ↓
   Self-hosted Runner (Debian)
       ↓
   Script ./sk deploy
       ↓
   PM2 Ecosystem
       ↓
┌─────────────────┬─────────────────┐
│   Backend       │   Frontend      │
│   Port 3001     │   Port 3000     │
│   API REST      │   Next.js       │
│   WebSocket     │   React/TS      │
│   Prisma/SQLite │   Static Build  │
└─────────────────┴─────────────────┘
```

## ⚙️ Configuration Requise

### Runner Self-hosted (Debian)
```bash
# Prérequis système
sudo apt update
sudo apt install nodejs npm git

# PM2 global
npm install -g pm2

# Permissions script
chmod +x sk
```

### Variables d'environnement
```bash
# .env (production)
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./prod.db"

# GitHub Secrets
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Structure projet
```
skullking_js/
├── sk                    # Script de gestion unifié
├── backend/             # API Node.js + WebSocket
├── frontend/            # Interface Next.js
├── .github/workflows/   # CI/CD automation
└── docs/               # Documentation complète
```

## 📊 Monitoring & Rapports

### Artefacts générés
- **Test reports** : Résultats tests détaillés
- **Coverage reports** : Couverture code
- **Performance reports** : Métriques performance
- **Security reports** : Audits sécurité
- **Quality reports** : Analyses qualité

### Notifications Discord
- ✅ Déploiement réussi
- ❌ Échec déploiement
- 🧪 Résultats tests
- 🔍 Alertes qualité
- 📦 Nouvelles releases

## 🚀 Démarrage Rapide

1. **Clone & setup**
   ```bash
   git clone https://github.com/sydnec/skullking_js.git
   cd skullking_js
   chmod +x sk
   ```

2. **Déploiement local**
   ```bash
   ./sk deploy-full    # Backend + Frontend
   ./sk status         # Vérifier les services
   ./sk logs          # Voir les logs
   ```

3. **Push pour déploiement auto**
   ```bash
   git add .
   git commit -m "feat: nouvelle fonctionnalité"
   git push origin main  # ⚡ Déclenchement auto CI/CD
   ```

Le workflow GitHub Actions se charge automatiquement du reste ! 🏴‍☠️
