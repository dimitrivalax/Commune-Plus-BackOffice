# Firebase Scheduled Functions

## Objet

Ce dossier contient la fonction planifiee `notifyLicenceExpiry` qui envoie un e-mail 45 jours avant la date d'expiration d'une licence de commune.

Regle metier:
- `date_expiration = date_licence + 1 an`
- envoi si `date_expiration` correspond a `aujourd'hui + 45 jours`

## Variables d'environnement requises

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optionnelle, defaut `noreply@commune-plus.fr`)
- `LICENSE_ALERT_TO_EMAIL` (optionnelle, defaut `contact@commune-plus.fr`)

## Commandes

Depuis `Commune-Plus-BackOffice/functions`:

- `npm install`
- `npm run build`
- `npm run deploy`

## Idempotence

La fonction marque chaque commune notifiee avec:
- `license_renewal_notified_for_expiration` (date AAAA-MM-JJ d'expiration notifiee)
- `license_renewal_last_notified_at` (timestamp serveur)

Si la meme expiration a deja ete notifiee, aucun nouvel e-mail n'est envoye.
