# Commune Plus BackOffice

BackOffice Nuxt (Nuxt UI) pour la gestion des communes, utilisateurs, signalements, salles, réservations, informations municipales et propositions.

Logiciel libre sous **EUPL-1.2**. L’offre hébergée [Commune Plus](https://commune-plus.fr) (SaaS) est un service distinct : marque, domaines et backends de production restent réservés. Les forks doivent déployer leurs propres comptes Firebase / Resend / Cloudinary.

Companion repo : [Commune-Plus-Mobile](https://github.com/dimitrivalax/Commune-Plus-Mobile).

## Stack

- Frontend : Nuxt 4 + Nuxt UI
- Auth client : Firebase Auth (ID token)
- API serveur : Nitro + Firebase Admin SDK (Firestore/Auth)
- Emails transactionnels : Resend
- Images : Cloudinary

## Installation

```bash
pnpm install
cp .env.example .env
```

Renseignez **vos** secrets (jamais commités). Voir `.env.example`.

## Self-host (aperçu)

1. Projet Firebase avec Auth + Firestore ; compte de service pour le serveur (`FIREBASE_SERVICE_ACCOUNT_JSON`).
2. Config web Firebase (`NUXT_PUBLIC_FIREBASE_*`).
3. Compte [Resend](https://resend.com) pour les e-mails transactionnels.
4. Compte Cloudinary (upload / transformation).
5. Optionnel : PostHog, Meta/Facebook (publication d’actualités), FCM pour le push.

Les fichiers `apphosting.yaml` / `apphosting.prod.yaml` illustrent un déploiement Firebase App Hosting avec Secret Manager — adaptez-les à votre environnement.

### Legacy `supabase/`

Le dossier `supabase/` et certaines notes associées sont **legacy**. Le runtime actuel n’utilise plus `@supabase/supabase-js` ; les e-mails mobiles publics passent par `POST /api/public/signalement-email`.

## Variables d'environnement principales

- `FIREBASE_SERVICE_ACCOUNT_JSON` : JSON complet du compte de service Firebase (admin)
- `NUXT_PUBLIC_FIREBASE_API_KEY`
- `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NUXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NUXT_PUBLIC_FIREBASE_APP_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_URL` (URL publique du BackOffice, utilisé dans certains emails)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Développement

```bash
pnpm dev
```

Application : `http://localhost:3000`.

## Build

```bash
pnpm build
pnpm preview
```

## Licence

Copyright (c) 2026 Dimitri Valax EI — [EUPL-1.2](./LICENSE).

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) et [SECURITY.md](./SECURITY.md).
