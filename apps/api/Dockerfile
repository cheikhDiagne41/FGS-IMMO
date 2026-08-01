# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

# OpenSSL requis par Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dépendances (monorepo npm workspaces)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Schéma Prisma présent avant npm ci (postinstall @prisma/client)
COPY apps/api/prisma apps/api/prisma
RUN npm ci

# Code source + build
COPY . .
RUN npm run prisma:generate -w apps/api \
 && npm run build -w apps/api \
 && npm run build -w apps/web

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

# node_modules (avec client Prisma généré) + artefacts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
# Frontend build servi par l'API (voir main.ts → web-dist)
COPY --from=build /app/apps/web/dist ./apps/api/web-dist
# Médias du site (photos de terrains, vidéos, logos des partenaires…) pour que
# la démonstration s'affiche complète. Les pièces d'identité des clients sont
# exclues par le .dockerignore et ne sont jamais publiées.
COPY --from=build /app/apps/api/uploads ./apps/api/uploads

WORKDIR /app/apps/api
EXPOSE 3000

# Migrations, puis données de démonstration, puis contenu vitrine réel
# (les deux sont rejouables sans créer de doublon), puis démarrage.
CMD npx prisma migrate deploy \
 && (npx ts-node prisma/seed.ts || echo "seed ignoré") \
 && (npx ts-node prisma/importer-vitrine.ts || echo "import vitrine ignoré") \
 && node dist/main.js
