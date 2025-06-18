# 🚀 GitHub Actions Workflows

## Déploiement automatique

### `deploy.yml` - Déploiement sur Raspberry Pi

Ce workflow se déclenche automatiquement lors d'un push sur la branche `main` et peut aussi être lancé manuellement.

#### Fonctionnement :
1. **Pull** : Récupère le code le plus récent
2. **Script SK** : Utilise le script `./sk deploy` qui :
   - Installe les dépendances backend
   - Configure Prisma et la base de données  
   - Redémarre le backend avec PM2
   
3. **Vérification** : Teste que l'API est accessible

#### Si vous voulez builder le frontend :
Utilisez `./sk deploy-full` en local si nécessaire.

#### Prérequis :
- Raspberry Pi configuré comme runner GitHub self-hosted
- PM2 installé globalement
- Node.js et npm configurés
- Script `sk` exécutable

#### Déclenchement manuel :
Allez dans l'onglet "Actions" de votre repository GitHub et cliquez sur "Run workflow" pour le workflow "Deploy to Raspberry Pi".

## Architecture de déploiement

```
GitHub Push → Raspberry Pi (Backend)
                ↓
            Port 3001 (PM2)
                ↓
        API + Socket.IO + DB
```

Le frontend est buildé mais reste statique - il peut être déployé séparément sur Vercel, Netlify, etc.
