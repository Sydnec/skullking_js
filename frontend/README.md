# Skull King - Frontend

Frontend Next.js pour le jeu Skull King, optimisé pour le déploiement sur Vercel.

## Structure du projet

Le projet a été séparé en deux parties :
- **Frontend** (ce dossier) : Interface utilisateur Next.js
- **Backend** : Serveur Express.js avec Socket.IO (dossier `../backend/`)

## Configuration

### Variables d'environnement

Créez un fichier `.env.local` avec :

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

Pour la production :
```bash
NEXT_PUBLIC_API_URL=https://votre-backend-domain.com
NEXT_PUBLIC_SOCKET_URL=https://votre-backend-domain.com
```

### Installation

```bash
npm install
```

### Développement

```bash
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000` et communiquera avec le backend sur le port 3001.

## Déploiement sur Vercel

### 1. Via l'interface Vercel

1. Connectez votre repository GitHub à Vercel
2. Définissez le **Root Directory** sur `frontend/`
3. Configurez les variables d'environnement :
   - `NEXT_PUBLIC_API_URL=https://votre-backend-domain.com`
   - `NEXT_PUBLIC_SOCKET_URL=https://votre-backend-domain.com`

### 2. Via la CLI Vercel

```bash
# Depuis le dossier frontend/
npx vercel

# Ou pour déployer en production
npx vercel --prod
```

### 3. Configuration du projet Vercel

Créez un fichier `vercel.json` dans le dossier frontend :

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://votre-backend-domain.com",
    "NEXT_PUBLIC_SOCKET_URL": "https://votre-backend-domain.com"
  }
}
```

## Important

⚠️ **Le backend doit être déployé séparément** et accessible depuis internet pour que le frontend fonctionne correctement.

Assurez-vous que :
1. Le backend est déployé et accessible
2. Les CORS sont configurés pour autoriser votre domaine Vercel
3. Les variables d'environnement pointent vers la bonne URL du backend

## Développement local

Pour développer localement avec la séparation frontend/backend :

1. **Terminal 1** - Backend :
```bash
cd ../backend
npm install
npm run dev
```

2. **Terminal 2** - Frontend :
```bash
cd frontend
npm install
npm run dev
```

Le frontend (port 3000) communiquera avec le backend (port 3001).
