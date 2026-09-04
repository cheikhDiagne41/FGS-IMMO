# FGS_IMMO — comment faire évoluer la plateforme

Ce document répond à une seule question : **« je veux ajouter ça, je touche à quoi ? »**
Il décrit l'organisation réelle du projet et les points d'accroche prévus pour
la suite.

---

## 1. La carte du projet

```
fgs-immo/
├── apps/api/                 NestJS + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma     les tables
│   │   ├── migrations/       l'historique du schéma
│   │   ├── seed.ts           jeu de données de démonstration
│   │   └── parametres-socle.ts   catalogue des réglages
│   ├── scripts/              sauvegarde, tests de sécurité, tests de réglages
│   └── src/
│       ├── common/           services transverses (périmètre vendeur, uploads)
│       ├── parametres/       réglages et interrupteurs de fonctionnalités
│       ├── public/           tout ce qui est visible sans compte
│       ├── sante/            sonde et diagnostic
│       └── <domaine>/        un dossier par domaine métier
└── apps/web/                 React + Vite + Tailwind
    ├── src/components/       éléments réutilisables
    ├── src/pages/            écrans de l'espace connecté
    ├── src/pages/public/     écrans du site vitrine
    └── src/lib/nav.ts        le menu, par rôle
```

Chaque domaine de l'API suit le même trio : `X.module.ts`, `X.controller.ts`
(les routes et les droits), `X.service.ts` (la logique), `dto/` (la validation
des données reçues).

---

## 2. Les cinq points d'accroche

### 2.1 Ajouter un réglage ou un interrupteur — **sans toucher au code**

C'est le chemin le plus court, à privilégier.

1. Espace admin → **Paramètres → ＋ Nouveau paramètre**.
2. Le réglage est disponible immédiatement.
3. Quand le code en aura besoin :

```ts
constructor(private parametres: ParametresService) {}

if (await this.parametres.actif('paiement_carte')) { … }
const jours = await this.parametres.nombre('reservation_duree_jours', 7);
const moyens = await this.parametres.liste('moyens_paiement');
const nom = await this.parametres.lire('site_nom', 'FGS_IMMO');
```

`ParametresService` est global : il s'injecte partout sans import de module.
Les valeurs sont mises en cache et le cache se vide à chaque modification.

Pour qu'un réglage fasse partie du socle (recréé au démarrage, non
supprimable), ajoutez-le plutôt dans `apps/api/prisma/parametres-socle.ts`.
Cochez « visible sur le site » pour qu'il sorte sur `GET /api/public/parametres`.

**Exemple concret déjà en place** : couper `messagerie_active` renvoie un 403
explicite au visiteur qui tente d'écrire.

### 2.2 Ajouter un domaine métier

```bash
cd apps/api && npx nest g module mandats && npx nest g controller mandats && npx nest g service mandats
```

Puis, en respectant les conventions de la maison :

- **Droits** : `@UseGuards(JwtAuthGuard, RolesGuard)` sur le contrôleur,
  `@Roles(Role.ADMIN, …)` sur chaque route.
- **Périmètre vendeur** : si l'objet appartient à un vendeur, ajoutez
  `vendeurId` au modèle et utilisez `PerimetreVendeurService` —
  `filtre(user)` dans les listes, `verifierAcces(user, proprietaireId)` avant
  toute modification. Sans ça, un vendeur verrait les biens de l'agence.
- **Pagination** : toute liste qui peut grossir renvoie
  `{ items, total, take, skip }` avec `take` plafonné à 200.
- **Validation** : un DTO avec `class-validator`. La configuration globale
  refuse les champs non déclarés — c'est ce qui bloque, par exemple, un
  `role: "ADMIN"` glissé dans une inscription.

Enregistrez le module dans `apps/api/src/app.module.ts`.

### 2.3 Modifier la base

Jamais `prisma db push` : les migrations sont l'historique du schéma.

```bash
cd apps/api
# 1. modifier prisma/schema.prisma
mkdir prisma/migrations/AAAAMMJJHHMMSS_ce_que_ca_fait
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
    --to-schema-datamodel prisma/schema.prisma --script \
    > prisma/migrations/AAAAMMJJHHMMSS_ce_que_ca_fait/migration.sql
npx prisma migrate deploy
npx prisma generate      # arrêter les processus Node d'abord (verrou Windows)
```

L'intégration continue échoue si le schéma change sans migration
correspondante.

Ajoutez un index dès qu'un champ sert à filtrer ou trier : c'est ce qui a fait
passer les écrans d'administration de 331 ms à 5 ms.

### 2.4 Ajouter un écran

1. Le composant dans `apps/web/src/pages/`.
2. La route dans `apps/web/src/App.tsx`.
3. L'entrée de menu dans `apps/web/src/lib/nav.ts`, **sous le bon rôle** — le
   menu est la seule chose qui change selon le rôle côté navigateur ; la vraie
   barrière est toujours côté serveur.

Conventions d'écran : `useQuery` pour lire, `useMutation` + `invalidateQueries`
pour écrire, classes `card` / `input` / `label` / `btn-primary`, couleurs
`brand` (bleu du logo) et `gold` (orange du logo).

### 2.5 Ajouter un rôle

1. Valeur dans l'enum `Role` du schéma + migration.
2. Entrée dans `navByRole` (`apps/web/src/lib/nav.ts`) et dans le type `Role`
   de `AuthContext`.
3. `@Roles(...)` sur les routes concernées.
4. Si le rôle a un périmètre restreint, étendez `PerimetreVendeurService`
   plutôt que de disperser des `if (role === …)`.

---

## 3. Ce qui protège les données — à ne pas défaire

| Règle | Où |
|---|---|
| Les pièces d'identité ne sont jamais servies en accès libre | `src/documents/`, blocage de `/uploads/documents` dans `main.ts` |
| Les envois de fichiers sont filtrés sur le type **et** l'extension | `src/common/upload.util.ts` |
| 10 échecs de connexion par IP puis blocage | `src/auth/guards/login-throttle.guard.ts` |
| Pas de secret JWT par défaut en production | `src/auth/jwt-secret.ts` |
| `uploads/documents` exclu de l'image de déploiement | `.dockerignore` |
| Un vendeur n'agit que sur ses propres biens | `src/common/perimetre-vendeur.service.ts` |

`npm run test:securite` rejoue 23 contrôles (authentification, cloisonnement
des rôles, accès horizontal, injections, fichiers piégés, exposition, force
brute). **À lancer avant chaque mise en ligne.**

---

## 4. Le filet de sécurité

```bash
npm run verifier          # types + build des deux applications
npm run test:securite     # contrôles de sécurité (serveur démarré)
npm run test:parametres   # les interrupteurs coupent bien les fonctionnalités
npm run sauvegarde        # base + fichiers, dans sauvegardes/AAAA-MM-JJ-HH-MM-SS
```

L'intégration continue (`.github/workflows/verification.yml`) rejoue types,
build et cohérence des migrations à chaque envoi sur `main`.

**Avant toute évolution qui touche au schéma ou aux données : `npm run
sauvegarde`.** Le dossier produit contient les pièces d'identité des clients —
il est confidentiel.

Supervision : `GET /api/sante` répond `{ statut: "ok" }` sans rien dévoiler ;
`GET /api/sante/diagnostic` (administrateur) donne version, latence de la base,
nombre de migrations appliquées et volumétrie.

---

## 5. Les chantiers naturels

Par ordre d'utilité, avec le point d'accroche déjà prêt :

1. **Paiement en ligne (Wave, Orange Money)** — l'interrupteur se crée dans
   Paramètres ; le domaine `paiements` existe déjà avec ses factures.
2. **Notifications par SMS / e-mail** — le modèle `Notification` existe et est
   alimenté ; il manque l'envoi réel et un réglage `notifications_sms`.
3. **Expiration automatique des réservations** — le réglage
   `reservation_duree_jours` est déjà là, il manque la tâche planifiée.
4. **Relances de retard** — même chose avec `relance_retard_jours` et
   `penalite_retard_pourcent`.
5. **Application mobile** — l'API est déjà séparée du site ; il faudrait
   surtout figer les routes publiques.
6. **Tests automatisés du métier** — le point faible actuel : les scripts
   couvrent la sécurité et les réglages, pas les calculs d'échéancier.

---

## 6. Points de vigilance connus

- **Mots de passe de démonstration** (`Password123`) présents dans le code et
  sur l'écran de connexion : à retirer avant toute mise en service réelle.
- **Documentation Swagger** ouverte en développement, coupée automatiquement
  en production (`NODE_ENV=production`), réactivable avec `ACTIVER_DOCS_API=true`.
- **Windows** : `npx prisma generate` échoue si un processus Node tourne
  (verrou sur le moteur Prisma) — arrêtez les serveurs avant.
- **Accents dans le terminal Windows** : passez par un script Node pour écrire
  des données accentuées, pas par `curl` en ligne de commande.
