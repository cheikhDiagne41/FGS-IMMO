# 🏠 FGS_IMMO — Plateforme immobilière

Plateforme web de gestion de vente de terrains, sites immobiliers, coopératives
d'habitat, clients, paiements (Wave / Orange Money) et facturation automatique.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |
| Backend | NestJS 11 (API REST) + Prisma ORM |
| Base de données | PostgreSQL 17 |
| Auth | JWT + RBAC (Admin / Gestionnaire / Comptable / Client) |

## Structure du monorepo

```
fgs-immo/
├── apps/
│   ├── api/          # API NestJS + Prisma
│   │   ├── prisma/   # schema.prisma + seed.ts
│   │   └── src/      # modules: auth, dashboard, sites, ...
│   └── web/          # Frontend React + Vite + Tailwind
└── package.json      # workspaces npm
```

## Démarrage

### 1. Prérequis
- Node.js ≥ 20
- PostgreSQL 17 (base `fgs_immo` créée)

### 2. Installation
```bash
npm install
```

### 3. Base de données
Copier `apps/api/.env.example` vers `apps/api/.env` et ajuster `DATABASE_URL`, puis :
```bash
npm run db:migrate      # applique les migrations Prisma
npm run db:seed         # crée les comptes de démo + données d'exemple
```

### 4. Lancer en développement
```bash
npm run dev             # API (:3000) + Web (:5173) simultanément
```
- Frontend : http://localhost:5173
- API : http://localhost:3000/api
- Documentation Swagger : http://localhost:3000/api/docs

## Comptes de démonstration (mot de passe : `Password123`)

| Rôle | Email |
|------|-------|
| Administrateur | admin@fgsimmo.sn |
| Gestionnaire | gestionnaire@fgsimmo.sn |
| Comptable | comptable@fgsimmo.sn |
| Client | client@fgsimmo.sn |

## Modules (feuille de route)

- [x] Authentification & rôles (RBAC)
- [x] Tableau de bord Administrateur (KPIs + graphiques)
- [x] Tableau de bord Client (progression, échéances)
- [x] Gestion des Sites (CRUD)
- [x] Gestion des Coopératives (rattachées à un site, contrôle des places)
- [x] Gestion des Terrains / parcelles (recherche multicritère, réservation)
- [x] Adhésion à une coopérative + échéancier automatique (dossier + compte coopérateur)
- [x] Paiements Wave / Orange Money (simulé) + gestion comptable (confirmer/annuler/rembourser)
- [x] Facturation PDF + QR Code + signature électronique (SHA-256)
- [~] Notifications (in-app fait ; Email / SMS à brancher)
- [ ] Attribution automatique des terrains
- [ ] Rapports (PDF / Excel)
- [ ] Carte interactive, recherche multicritère, i18n FR/EN
