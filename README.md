# SkullKing Mono-repo

Mono-repo pour le projet SkullKing — frontend Next.js et backend Node/Express avec Prisma + PostgreSQL.

Ce README centralise les commandes et les bonnes pratiques pour le développement local.

Principales actions

- Installer les dépendances pour l'ensemble du workspace:

  npm run install:all

- Démarrer la base de données (docker-compose):

  npm run db:up

- Appliquer les migrations Prisma (backend):

  cd backend
  npm run prisma:migrate

  (ou, pour ne pas créer de migration et juste générer le client)
  npm run prisma:generate

- Lancer les serveurs en dev (frontend + backend):

  npm run dev

Structure du repo

- backend/ — API Express + Prisma, scripts de migration et OpenAPI
  - openapi.json — spec OpenAPI succincte (générée / maintenue)
  - postman_collection.json — collection Postman générée
  - prisma/ — schéma, migrations et seed
  - src/ — code source backend (routes API, socket.io, contrôleurs)

- frontend/ — application Next.js (app router)
  - src/app — pages et composants (Chat, RoomList, Room page…)

API / Documentation

- L'API principale est exposée sur /api/v1. Vous pouvez consulter la spec OpenAPI intégrée via Swagger UI (si le package est installé) sur /api-docs lorsque le backend tourne.
- Une collection Postman simplifiée est fournie dans `backend/postman_collection.json`. Vous pouvez l'exécuter localement avec Newman :

  cd backend
  npx newman run postman_collection.json --env-var "baseUrl=http://localhost:3001/api/v1"

Prisma / Base de données

- Les migrations se trouvent dans `backend/prisma/migrations`.
- Pour appliquer les migrations et (re)générer le client Prisma :

  cd backend
  npm run prisma:migrate
  npm run prisma:generate

- Seed (optionnel) :

  npm run prisma:seed

Bonnes pratiques et notes de maintenance

- Après modification du schéma Prisma, lancer `npm run prisma:migrate` puis `npm run prisma:generate`.
- L'OpenAPI est maintenue dans `backend/openapi.json`. Un petit script d'aide existe dans `backend/scripts/generate_openapi.js`.
- La collection Postman est un template minimal ; il peut être régénéré/modifié si vous enrichissez l'OpenAPI.