# 🏴‍☠️ Skull King - Jeu de Cartes Multijoueur

Une implémentation en ligne du célèbre jeu de cartes **Skull King** développée avec Next.js, TypeScript, Socket.IO et Prisma.

## 🎮 À propos du jeu

Skull King est un jeu de plis astucieux où les joueurs doivent prédire exactement le nombre de plis qu'ils vont remporter à chaque manche. Le jeu utilise un jeu de cartes unique comprenant :

- **Cartes numériques** : 1-14 dans 4 couleurs (Noir, Rouge, Bleu, Jaune)
- **Cartes spéciales** :
  - 🏴‍☠️ **Skull King** (1 carte) - La carte la plus puissante
  - 🏴‍☠️ **Pirates** (5 cartes) - Battent toutes les cartes colorées
  - 🧜‍♀️ **Sirènes** (2 cartes) - Capturent les pirates
  - 🐯 **Tigresse** (1 carte) - Agis comme une fuite ou comme un pirate, au choix  
  - 🏃‍♂️ **Fuites** (5 cartes) - Ne peuvent remporter aucun pli

## ✨ Fonctionnalités

- 🌐 **Multijoueur en temps réel** avec Socket.IO
- 🏠 **Système de salles** avec codes d'accès
- 👥 **2-8 joueurs** par partie
- 📱 **Interface responsive** adaptée mobile et desktop
- 💾 **Persistance des données** avec Prisma et SQLite
- 🔄 **Reconnexion automatique** après déconnexion
- 🎯 **Système de scores** fidèle aux règles officielles
- 🎨 **Interface moderne** avec Tailwind CSS

## 🛠️ Technologies utilisées

- **Frontend** : Next.js 15, React 19, TypeScript
- **Backend** : Node.js, Socket.IO
- **Base de données** : Prisma ORM avec SQLite
- **Styling** : Tailwind CSS
- **Temps réel** : Socket.IO pour la communication bidirectionnelle

## 🚀 Installation et démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation

1. **Clonez le repository**
```bash
git clone https://github.com/votre-username/skullking_js.git
cd skullking_js
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Configurez la base de données**
```bash
npx prisma generate
npx prisma db push
```

4. **Démarrez le serveur de développement**
```bash
npm run dev
```

5. **Ouvrez votre navigateur**
Rendez-vous sur [http://localhost:3000](http://localhost:3000)

## 📖 Comment jouer

1. **Créez ou rejoignez une salle** avec un code de salle
2. **Attendez les autres joueurs** (minimum 2, maximum 8)
3. **Le créateur lance la partie**
4. **Pour chaque manche** :
   - Recevez vos cartes (1 carte au round 1, 2 au round 2, etc.)
   - **Pariez** sur le nombre de plis que vous pensez remporter
   - **Jouez vos cartes** à tour de rôle
   - Gagnez des points si votre pari est exact !

### 🏆 Système de points

- **Pari réussi** : 20 points + 10 points par pli remporté
- **Pari raté** : -10 points par pli de différence
- **Bonus spéciaux** pour certaines combinaisons

## 🚀 Déploiement

### Déploiement local

1. **Préparez le déploiement**
```bash
./prepare-deployment.sh
```

2. **Démarrez le serveur de production**
```bash
npm run build
npm start
```

### Déploiement sur Vercel

1. **Préparez votre projet**
```bash
./prepare-deployment.sh
```

2. **Déployez via le dashboard Vercel**
   - Connectez votre repository GitHub
   - Configurez les variables d'environnement
   - Déployez automatiquement

3. **Variables d'environnement requises**
```env
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secure-secret
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://your-app.vercel.app
NODE_ENV=production
```

📖 **Guide complet** : [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🗂️ Structure du projet

```
skullking_js/
├── src/
│   ├── app/                 # Pages Next.js (App Router)
│   │   ├── page.tsx         # Page d'accueil
│   │   ├── [roomCode]/      # Pages de salle dynamiques
│   │   └── api/             # API Routes
│   ├── components/          # Composants React
│   │   ├── GameLobby.tsx    # Lobby de jeu
│   │   ├── GameRoom.tsx     # Salle de jeu
│   │   └── UsernameForm.tsx # Formulaire de connexion
│   ├── lib/                 # Utilitaires et services
│   │   ├── skull-king-engine.ts  # Moteur de jeu
│   │   ├── socket-server.ts      # Configuration Socket.IO
│   │   └── prisma.ts             # Client Prisma
│   ├── types/               # Définitions TypeScript
│   └── hooks/               # Hooks React personnalisés
├── prisma/                  # Schéma de base de données
├── game-logic.js           # Logique de jeu côté serveur
└── server.js               # Serveur Express + Socket.IO
```

## 🎯 Scripts disponibles

- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Build de production
- `npm run start` - Démarre le serveur de production
- `npm run lint` - Vérification ESLint

## 🔧 Configuration

Le projet utilise un fichier `.env` pour la configuration :

```env
DATABASE_URL="file:./dev.db"
PORT=3000
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Forker le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commiter vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pusher sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Roadmap

- [ ] Amélioration de l'UI/UX
- [ ] Ajout d'animations pour les cartes
- [ ] Mode spectateur
- [ ] Chat intégré

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Sydnec**