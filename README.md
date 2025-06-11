# 🏴‍☠️ Skull King - Jeu de Cartes Multijoueur

Une implémentation en ligne du célèbre jeu de cartes **Skull King** développée avec Next.js, TypeScript, Socket.IO et Prisma.

![Skull King Screenshot](https://img.shields.io/badge/Game-Skull%20King-red) ![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-green) ![Prisma](https://img.shields.io/badge/Prisma-6.9.0-indigo)

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

## 🛠️ Technologies

- **Frontend** : Next.js 15, React 19, TypeScript
- **Backend** : Node.js, Socket.IO  
- **Base de données** : Prisma ORM + SQLite
- **Styling** : Tailwind CSS

## 📚 Documentation

La documentation complète est organisée en guides spécialisés :

- **[📦 Guide d'installation](docs/INSTALLATION.md)** - Installation, déploiement et configuration complète
- **[🏴‍☠️ Règles du jeu](docs/RULES.md)** - Règles officielles détaillées avec exemples
- **[🤝 Guide de contribution](docs/CONTRIBUTING.md)** - Comment contribuer au projet

## 🎮 Comment jouer

1. **Créez ou rejoignez une salle** avec un code
2. **Attendez les autres joueurs** (2-8 joueurs)
3. **Pariez** sur vos plis à chaque manche
4. **Jouez vos cartes** en suivant les règles
5. **Gagnez des points** si votre pari est exact !

> 📖 **Règles complètes** : Consultez le [guide des règles](docs/RULES.md) pour tous les détails.

## ⚡ Outil de gestion `sk`

Le script `sk` simplifie toutes les opérations :

```bash
./sk deploy    # Déploiement complet
./sk start     # Démarrer l'application
./sk stop      # Arrêter l'application
./sk logs      # Voir les logs
./sk monitor   # Monitoring en temps réel
./sk update    # Mise à jour complète
```

> 🔧 **Installation détaillée** : Voir le [guide d'installation](docs/INSTALLATION.md)

## 🗂️ Structure du projet

```
skullking_js/
├── docs/                    # 📚 Documentation complète
│   ├── INSTALLATION.md      # Guide d'installation et déploiement
│   ├── RULES.md            # Règles officielles du jeu
│   └── CONTRIBUTING.md     # Guide de contribution
├── src/                    # Code source
│   ├── app/               # Next.js App Router
│   ├── components/        # Composants React
│   ├── lib/              # Services et utilitaires
│   ├── types/            # Types TypeScript
│   └── hooks/            # Hooks personnalisés
├── prisma/               # Base de données
├── game-logic.js         # Moteur de jeu serveur
├── server.js            # Serveur Socket.IO
└── sk                   # Script de gestion unifié
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez le [guide de contribution](docs/CONTRIBUTING.md) pour :

- 🔄 Processus de contribution
- 🧪 Standards de code
- 🐛 Signalement de bugs
- ✨ Propositions de fonctionnalités

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Sydnec** - [GitHub](https://github.com/sydnec)

---

## 🎯 Liens utiles

- 📖 [Documentation complète](docs/)
- 🏴‍☠️ [Règles officielles Skull King](docs/RULES.md)
- 🔧 [Guide d'installation](docs/INSTALLATION.md)

---

*Amusez-vous bien en jouant à Skull King ! 🏴‍☠️*
