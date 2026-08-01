# Mettre la démonstration en ligne (gratuit)

Objectif : disposer d'une adresse publique à montrer au client, sans rien payer.

- **Application** : Render (offre gratuite)
- **Base de données** : Render Postgres (gratuite, valable 30 jours) ou Neon (gratuite, sans limite de durée)

Durée : environ 10 minutes.

---

## 1. Créer le compte Render

1. Aller sur **https://render.com** → *Get Started*
2. Choisir **Sign in with GitHub** (pas de carte bancaire demandée)
3. Autoriser Render à accéder au dépôt **cheikhDiagne41/FGS-IMMO**

## 2. Déployer

1. Dans Render : **New +** → **Blueprint**
2. Sélectionner le dépôt **FGS-IMMO**
3. Render détecte le fichier `render.yaml` et propose :
   - un service web `fgs-immo`
   - une base `fgs-immo-db`
4. Cliquer sur **Apply**

Le premier déploiement prend 5 à 10 minutes (construction de l'image).

À la fin, l'adresse publique s'affiche, du type :
`https://fgs-immo.onrender.com`

## 3. Vérifier

Ouvrir l'adresse : la page d'accueil doit apparaître avec la vidéo, les terrains et le pied de page.

Connexion à l'administration :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Administrateur | `admin@fgsimmo.sn` | `Password123` |

> ⚠️ **À changer avant toute utilisation réelle.** Ces identifiants sont publics
> (ils figurent dans le code). Ils conviennent pour une démonstration, pas pour
> de vraies données.

---

## Ce qu'il faut savoir pendant la démonstration

**Le site s'endort après 15 minutes sans visite.** Le premier chargement prend
alors ~40 secondes. Ouvrez la page **une minute avant** de présenter au client.

**Les fichiers envoyés depuis le site en ligne ne sont pas conservés.** Si vous
ajoutez une photo ou une vidéo depuis la démonstration, elle disparaîtra au
prochain déploiement. Les médias déjà présents (photos des terrains, vidéo
d'accueil, photos de la gouvernance) sont embarqués dans l'application et
restent, eux, toujours affichés.

**Les pièces d'identité des clients ne sont jamais envoyées en ligne.** Elles
restent sur votre poste (exclues via `.dockerignore`).

**La base gratuite de Render expire au bout de 30 jours.** Passé ce délai, il
reste 14 jours pour la basculer en payant, sinon les données sont supprimées.
Pour éviter cette limite, voir ci-dessous.

---

## Option : base de données sans limite de durée (Neon)

Si la démonstration doit rester en ligne plus d'un mois :

1. Créer un compte sur **https://neon.com** (gratuit, sans carte bancaire)
2. Créer un projet, puis copier la **chaîne de connexion** (`postgresql://…`)
3. Dans Render : service `fgs-immo` → **Environment** → modifier `DATABASE_URL`
   et y coller la chaîne de connexion Neon
4. **Manual Deploy** → *Deploy latest commit*

La base Neon n'expire pas.

---

## Mettre à jour la démonstration

Le déploiement est automatique : chaque `git push` sur la branche `main`
reconstruit et met le site à jour.

### Y transférer le contenu saisi en local

Le contenu vitrine (sites, terrains et leurs photos, coopératives, actualités,
trophées, gouvernance, partenaires) est repris depuis le fichier
`apps/api/prisma/vitrine.json`.

Pour le rafraîchir après avoir modifié des choses en local :

```bash
cd apps/api && npx ts-node prisma/exporter-vitrine.ts
```

puis committer le fichier mis à jour et pousser. Le contenu est réinjecté au
démarrage suivant, sans jamais créer de doublon.

> Les clients, adhésions, paiements et factures ne sont **pas** exportés :
> ce sont des données personnelles, elles restent sur votre poste.

---

## Avant une mise en ligne réelle (payante)

1. Changer tous les mots de passe des comptes.
2. Prévoir un **stockage externe** pour les photos et vidéos (les fichiers
   envoyés doivent survivre aux déploiements).
3. Passer la base et le service en offre payante (le site ne s'endort plus).
4. Associer un nom de domaine.
