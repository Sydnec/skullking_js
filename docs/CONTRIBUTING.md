# 🤝 Guide de contribution

Merci de votre intérêt pour contribuer à Skull King ! Ce guide vous aidera à participer efficacement au développement du projet.

## 🚀 Premiers pas

### Prérequis pour contribuer
- **Node.js** 18+
- **Git** configuré
- **Connaissance de base** en TypeScript/JavaScript
- **Familiarité** avec React et Next.js (optionnel mais utile)

### Configuration de l'environnement de développement

1. **Fork** le repository sur GitHub
2. **Clone** votre fork localement :
   ```bash
   git clone https://github.com/votre-username/skullking_js.git
   cd skullking_js
   ```
3. **Configurez** les remotes :
   ```bash
   git remote add upstream https://github.com/sydnec/skullking_js.git
   ```
4. **Installez** les dépendances :
   ```bash
   npm install
   ./sk deploy  # ou npm run dev
   ```

---

## 🔄 Workflow de contribution

### 1. Créer une branche feature

```bash
# Synchroniser avec la branche principale
git checkout main
git pull upstream main

# Créer une nouvelle branche
git checkout -b feature/nom-de-votre-feature
```

### 2. Développer votre feature

- **Commitez** régulièrement avec des messages clairs
- **Testez** vos modifications localement
- **Respectez** les conventions du projet

### 3. Préparer la Pull Request

```bash
# Vérifier que tout fonctionne
npm run type-check
npm run lint
./sk status

# Pousser la branche
git push origin feature/nom-de-votre-feature
```

### 4. Soumettre la Pull Request

1. Ouvrez une **Pull Request** sur GitHub
2. **Décrivez** clairement vos modifications
3. **Liez** les issues résolues si applicable
4. **Attendez** la review et répondez aux commentaires

---

## 📋 Types de contributions

### 🐛 Corrections de bugs
- **Issues** étiquetées `bug`
- **Reproduction** du problème
- **Tests** pour éviter les régressions

### ✨ Nouvelles fonctionnalités
- **Issues** étiquetées `enhancement`
- **Discussion** préalable recommandée
- **Documentation** mise à jour

### 📚 Documentation
- Amélioration des **guides existants**
- Ajout d'**exemples** et **tutoriels**
- Correction des **erreurs** et **typos**

### 🎨 Interface utilisateur
- Améliorations **UX/UI**
- **Responsive design**
- **Accessibilité**

### ⚡ Performances
- **Optimisations** côté client/serveur
- **Réduction** de la taille des bundles
- **Amélioration** des temps de réponse

---

## 🏗️ Architecture du projet

### Structure des dossiers

```
src/
├── app/                    # App Router Next.js
│   ├── page.tsx           # Page d'accueil
│   ├── [roomCode]/        # Pages dynamiques des salles
│   └── api/               # API Routes
├── components/            # Composants React réutilisables
│   ├── GameLobby.tsx     # Lobby principal
│   ├── GameRoom.tsx      # Interface de jeu
│   └── ...
├── lib/                   # Logique métier et services
│   ├── skull-king-engine.ts  # Moteur de jeu principal
│   ├── api.ts            # Services API
│   └── ...
├── types/                 # Définitions TypeScript
└── hooks/                 # Hooks React personnalisés
```

### Composants clés

#### Moteur de jeu (`skull-king-engine.ts`)
- **Logique pure** du jeu Skull King
- **Calcul des scores** et validation des règles
- **Résolution des plis** selon la hiérarchie des cartes

#### Socket.IO (`useGameSocket.ts`)
- **Communication temps réel** entre clients et serveur
- **Synchronisation** des états de jeu
- **Gestion** des déconnexions/reconnexions

#### Persistance (`prisma/`)
- **Base de données** SQLite/PostgreSQL
- **Modèles** : User, Room, RoomPlayer, GameState
- **Migrations** automatiques

---

## 📝 Conventions de code

### Style de code
- **TypeScript** strict activé
- **ESLint** + **Prettier** pour le formatage
- **Imports** organisés et typés

### Nommage
- **Composants** : PascalCase (`GameLobby.tsx`)
- **Fonctions** : camelCase (`calculateScore`)
- **Constants** : UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- **Types** : PascalCase (`SkullKingGameState`)

### Structure des composants React

```typescript
// Imports
import { useState, useEffect } from 'react';
import { Card } from '@/types/skull-king';

// Types/Interfaces
interface GameRoomProps {
  roomCode: string;
  players: Player[];
}

// Composant principal
export default function GameRoom({ roomCode, players }: GameRoomProps) {
  // Hooks d'état
  const [gameState, setGameState] = useState<GameState | null>(null);
  
  // Hooks d'effet
  useEffect(() => {
    // Logique d'effet
  }, []);

  // Fonctions utilitaires
  const handlePlayCard = (cardId: string) => {
    // Logique de jeu de carte
  };

  // Rendu
  return (
    <div className="game-room">
      {/* JSX */}
    </div>
  );
}
```

### Gestion des erreurs

```typescript
// Fonctions utilitaires avec gestion d'erreur
export function calculateScore(player: Player): number {
  try {
    // Logique de calcul
    return score;
  } catch (error) {
    console.error('Error calculating score:', error);
    return 0;
  }
}

// Composants avec error boundaries
const [error, setError] = useState<string | null>(null);

if (error) {
  return <ErrorMessage message={error} />;
}
```

---

## 🧪 Tests et validation

### Tests locaux

```bash
# Vérification TypeScript
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Tests de fonctionnement
./sk status
./sk api
```

### Tests manuels recommandés

1. **Création/rejoindre** une salle
2. **Jeu complet** avec plusieurs joueurs
3. **Déconnexion/reconnexion** d'un joueur
4. **Calcul des scores** avec bonus
5. **Chat** en temps réel
6. **Responsive design** sur mobile

### Cas de test spécifiques

#### Moteur de jeu
- **Résolution des plis** selon toutes les règles
- **Calcul des scores** avec tous les bonus possibles
- **Validation des coups** joués

#### Interface utilisateur
- **États de chargement** et erreurs
- **Animations** fluides
- **Accessibilité** clavier et écran

---

## 🐛 Signalement de bugs

### Template d'issue

```markdown
## Description du bug
Brève description du problème

## Étapes pour reproduire
1. Aller à '...'
2. Cliquer sur '...'
3. Faire défiler jusqu'à '...'
4. Voir l'erreur

## Comportement attendu
Ce qui devrait se passer

## Comportement actuel
Ce qui se passe réellement

## Captures d'écran
Si applicable, ajoutez des captures d'écran

## Environnement
- OS: [ex: Windows 10]
- Navigateur: [ex: Chrome 96]
- Version Node.js: [ex: 18.0.0]

## Informations supplémentaires
Tout autre contexte utile
```

### Logs utiles

```bash
# Logs de l'application
./sk logs

# Logs de la base de données
cat logs/combined.log | grep "DATABASE"

# Logs des erreurs
cat logs/error.log
```

---

## 💡 Proposer une fonctionnalité

### Template de feature request

```markdown
## Fonctionnalité souhaitée
Description claire de la fonctionnalité

## Problème résolu
Quel problème cette fonctionnalité résout-elle ?

## Solution proposée
Comment imaginez-vous l'implémentation ?

## Alternatives considérées
Y a-t-il d'autres façons de résoudre ce problème ?

## Informations supplémentaires
Tout autre contexte, captures d'écran, etc.
```

### Roadmap et priorités

Consultez les **milestones** et **projects** GitHub pour voir les priorités actuelles :

#### Priorité haute
- Bugs critiques affectant le gameplay
- Problèmes de sécurité
- Compatibilité navigateurs

#### Priorité moyenne
- Nouvelles fonctionnalités demandées
- Améliorations UX/UI
- Optimisations performances

#### Priorité basse
- Fonctionnalités "nice-to-have"
- Refactoring technique
- Documentation étendue

---

## 📋 Checklist de Pull Request

Avant de soumettre votre PR, vérifiez :

### Code
- [ ] **TypeScript** compile sans erreur (`npm run type-check`)
- [ ] **ESLint** ne remonte aucune erreur (`npm run lint`)
- [ ] **Code testé** manuellement
- [ ] **Pas de console.log** oublié
- [ ] **Performance** vérifiée (pas de boucles infinies, etc.)

### Fonctionnalité
- [ ] **Fonctionne** comme attendu
- [ ] **Edge cases** gérés
- [ ] **Erreurs** gérées proprement
- [ ] **Interface** responsive si applicable

### Documentation
- [ ] **README** mis à jour si nécessaire
- [ ] **Commentaires** dans le code pour la logique complexe
- [ ] **Types** TypeScript documentés
- [ ] **Changements** listés dans la description de la PR

### Git
- [ ] **Commits** atomiques et bien nommés
- [ ] **Branche** synchronisée avec main
- [ ] **Pas de merge conflicts**
- [ ] **Historique** propre (squash si nécessaire)

---

## 🏆 Reconnaissance

### Contributeurs

Tous les contributeurs sont listés dans :
- **README principal** avec liens GitHub
- **Page About** de l'application
- **Releases notes** pour les contributions majeures

### Types de contributions reconnues

- 💻 **Code** - Développement de fonctionnalités et corrections
- 🐛 **Tests** - Signalement et correction de bugs
- 📖 **Documentation** - Amélioration des guides et tutoriels
- 🎨 **Design** - Interface et expérience utilisateur
- 💡 **Idées** - Propositions de fonctionnalités et améliorations
- 🌍 **Traduction** - Localisation en différentes langues

---

## 📞 Obtenir de l'aide

### Canaux de communication

- **GitHub Issues** : Questions techniques et bugs
- **GitHub Discussions** : Discussions générales et idées
- **Discord** : Chat en temps réel (lien dans le README)

### Mentoring

Si vous êtes nouveau/nouvelle dans le projet ou l'open source :
- Cherchez les issues étiquetées `good first issue`
- N'hésitez pas à **poser des questions**
- Les mainteneurs sont là pour **vous aider**

---

## 📜 Code de conduite

### Nos engagements

- **Respectueux** : Traiter tout le monde avec respect
- **Inclusif** : Accueillir les contributions de tous
- **Constructif** : Donner des feedbacks bienveillants
- **Professionnel** : Maintenir un environnement de travail sain

### Comportements inacceptables

- Langage ou images inappropriés
- Attaques personnelles ou politiques
- Harcèlement public ou privé
- Publication d'informations privées sans permission

### Application

Les violations peuvent être signalées en contactant l'équipe du projet. Toutes les plaintes seront examinées et donneront lieu à une réponse appropriée.

---

## 🔄 Processus de release

### Versioning

Le projet suit le [Semantic Versioning](https://semver.org/) :
- **MAJOR** : Changements incompatibles
- **MINOR** : Nouvelles fonctionnalités compatibles
- **PATCH** : Corrections de bugs

### Cycle de release

1. **Développement** sur branches feature
2. **Merge** dans main après review
3. **Testing** automatique et manuel
4. **Release** avec notes de version
5. **Déploiement** en production

---

Merci de contribuer à Skull King ! Ensemble, nous créons une meilleure expérience de jeu pour tous. 🏴‍☠️
