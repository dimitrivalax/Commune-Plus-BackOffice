# Notifications push Signalements

## Flux

1. L'utilisateur mobile cree un signalement dans Firestore.
2. Le BackOffice met a jour le statut ou la reponse du signalement.
3. Le BackOffice recupere les tokens actifs (`push_token`) lies a l'utilisateur.
4. Envoi FCM via compte de service Firebase.
5. L'app mobile recoit la notification et peut naviguer vers le detail.

## Dependances

- Collection Firestore `push_token`
- Variables serveur :
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (recommande)
  - ou `FCM_SERVICE_ACCOUNT_JSON` / `FCM_SERVICE_ACCOUNT_PATH`

## Remarques

- Les tokens invalides doivent etre desactives (`is_active = false`).
- Le routage mobile depend du payload (`signalement_id`, `type`).
