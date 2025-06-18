# 🏴‍☠️ Skull King - Jeu de Cartes Multijoueur

Une implémentation en ligne du célèbre jeu de cartes **Skull King** avec architecture frontend/backend séparée.

![Skull King Screenshot](https://img.shields.io/badge/Game-Skull%20King-red) ![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black) ![Express.js](https://img.shields.io/badge/Express.js-4.21.2-yellow) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-green) ![Prisma](https://img.shields.io/badge/Prisma-6.10.0-indigo)

## 🎮 À propos

Skull King est un jeu de plis stratégique où les joueurs doivent prédire exactement le nombre de plis qu'ils vont remporter. Cette implémentation offre une expérience multijoueur complète avec interface moderne et règles officielles.

## ✨ Fonctionnalités principales

- 🌐 **Multijoueur en temps réel** (2-8 joueurs)
- 🏠 **Système de salles** avec codes d'accès
- 📱 **Interface responsive** (mobile/desktop)
- 💾 **Persistance des données** avec reconnexion automatique
- 🎯 **Système de scores** fidèle aux règles officielles
- 💬 **Chat en temps réel** intégré
- 🎨 **Interface moderne** avec cartes personnalisées

## 🏗️ Architecture

Le projet est organisé en **deux services indépendants** :

- **🔧 Backend** : Express.js + Socket.IO (Port 3001)
  - API REST pour la gestion des utilisateurs et salles
  - Socket.IO pour le gameplay temps réel
  - Base de données Prisma + PostgreSQL/SQLite

- **🎨 Frontend** : Next.js React (Port 3000)
  - Interface utilisateur moderne
  - Communication avec API externe
  - Déployable sur Vercel

## 🛠️ Technologies

- **Frontend** : Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend** : Express.js, Socket.IO, JavaScript
- **Base de données** : Prisma ORM + SQLite/PostgreSQL
- **Déploiement** : Vercel (Frontend) + VPS/Cloud (Backend)

## 📚 Documentation

La documentation complète est organisée en guides spécialisés :

- **[🏴‍☠️ Règles du jeu](docs/RULES.md)** - Règles officielles détaillées
- **[🤝 Guide de contribution](docs/CONTRIBUTING.md)** - Comment contribuer au projet

## 🚀 Démarrage rapide

### Développement local
```bash
# Démarrer les deux serveurs automatiquement
./sk deploy-all

# Ou manuellement :
./sk dev
```

### Production
```bash
# Backend (auto-hébergé)
./sk deploy

# Frontend (Vercel)
# Configurez les variables d'environnement et déployez
```

## 🎮 Comment jouer

1. **Créez ou rejoignez une salle** avec un code
2. **Attendez les autres joueurs** (2-8 joueurs)
3. **Pariez** sur vos plis à chaque manche
4. **Jouez vos cartes** en suivant les règles
5. **Gagnez des points** si votre pari est exact !

> 📖 **Règles complètes** : Consultez le [guide des règles](docs/RULES.md) pour tous les détails.

## 🗂️ Structure du projet

```
skullking_js/
├── 🔧 backend/              # Express.js + Socket.IO (Port 3001)
│   ├── server.js           # Point d'entrée serveur
│   ├── src/api/            # Routes API REST
│   ├── src/game/           # Logique de jeu
│   └── src/database/       # Configuration Prisma
├── 🎨 frontend/            # Next.js React (Port 3000)
│   ├── src/app/            # Pages Next.js
│   ├── src/components/     # Composants React
│   └── src/lib/            # Utilitaires et API client
├── docs/                   # 📚 Documentation
│   ├── RULES.md           # Règles officielles du jeu
│   └── CONTRIBUTING.md     # Guide de contribution
└── sk                      # Script de production
```
## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez le [guide de contribution](docs/CONTRIBUTING.md) pour :

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

**📅 Dernière mise à jour:** Juin 2025

## 👨‍💻 Auteur

**Sydnec** - [GitHub](https://github.com/sydnec)

---

## 🎯 Liens utiles

- 📖 [Documentation complète](docs/)
- 🏴‍☠️ [Règles officielles Skull King](docs/RULES.md)
- 🔧 [Guide d'installation](docs/INSTALLATION.md)

---

*Amusez-vous bien en jouant à Skull King ! 🏴‍☠️*
