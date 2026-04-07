# Commune Plus BackOffice

BackOffice Nuxt (Nuxt UI) pour la gestion des communes, utilisateurs, signalements, salles, réservations, informations municipales et propositions.

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

Application accessible sur `http://localhost:3000`.

## Build

```bash
pnpm build
pnpm preview
```

## Notes migration

- Le projet n'utilise plus `@supabase/supabase-js` côté runtime.
- Les endpoints mobiles publics pour email passent par `POST /api/public/signalement-email`.
