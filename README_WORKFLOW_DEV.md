# Workflow de Développement Skull King

Ce guide décrit le workflow standard pour développer sur le projet Skull King, depuis la branche `dev` jusqu'à la mise en production.

## 1. Pré-requis
- Avoir un accès en écriture au dépôt GitHub
- Node.js, npm et git installés localement
- Avoir forké et cloné le dépôt si besoin

## 2. Se positionner sur la branche de développement

```bash
git checkout dev
git pull origin dev
```

## 3. Développer ta fonctionnalité directement sur `dev`
- Coder, tester localement
- Commiter régulièrement :

```bash
git add .
git commit -m "feat: description de la fonctionnalité"
```

## 4. Pousser sur la branche `dev`

```bash
git push origin dev
```

## 5. Tests automatiques
- Les tests automatiques se lancent sur GitHub Actions à chaque push sur `dev`
- Vérifier l’onglet Actions pour le résultat

## 6. Passer en production (`main`)
- Quand la branche `dev` est stable et validée, créer une Pull Request de `dev` vers `main`
- Les tests automatiques sont lancés
- Une fois validé, fusionner dans `main`

## 7. Taguer la release
- Sur `main`, créer un tag correspondant à la version (ex: `v1.2.3`)

```bash
git checkout main
git pull origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

- Le workflow de release et de déploiement se lance automatiquement

## 8. Récapitulatif des branches
- `dev` : branche de développement principale
- `main` : branche de production

---

**Tips :**
- Toujours partir de la dernière version de `dev` avant de coder
- Ne jamais merger directement dans `main` sans passer par une PR et les tests
- Utiliser des messages de commit clairs et explicites

---

Pour toute question, consulte le fichier `CONTRIBUTING.md` ou demande à l’équipe !
