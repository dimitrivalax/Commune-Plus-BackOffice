# ADR: Implementer le callback Meta de suppression de donnees avec revocation active des Pages

## Statut

Accepte

## Date

2026-05-07

## Contexte

Meta demande la mise en conformite "Data Deletion Request Callback" pour les apps qui accedent a des donnees utilisateur Facebook.

Concretement, le callback doit:

- recevoir un `signed_request` (POST HTTPS),
- verifier la signature HMAC-SHA256 avec `FACEBOOK_APP_SECRET`,
- declencher la suppression des donnees associees a l'utilisateur,
- retourner `{ url, confirmation_code }` vers une page de statut publique.

Avant cette decision, le BackOffice stockait la configuration de publication Facebook par commune (`commune_facebook_config`) avec token de page chiffre, mais sans ASID Facebook du connecteur. Cette absence empechait de relier une demande de suppression Meta a des donnees internes pour une suppression/revocation effective.

## Decision

Adopter une implementation "complete" du callback de suppression Meta:

1. **Stocker l'ASID au moment de la connexion OAuth**
   - Lors du callback OAuth Facebook, recuperer l'identifiant utilisateur Facebook via `/me?fields=id`.
   - Persister cet ASID dans `commune_facebook_config.connected_facebook_user_asid`.

2. **Implementer un endpoint public de suppression**
   - Endpoint: `POST /api/facebook/data-deletion`.
   - Verifier et parser `signed_request`.
   - Trouver les configurations `commune_facebook_config` liees a l'ASID.
   - Revoquer activement les connexions trouvees:
     - `token_status = 'revoked'`
     - suppression de `encrypted_page_access_token`
     - suppression de `connected_facebook_user_asid`
   - Journaliser le traitement dans `facebook_data_deletion_requests`.
   - Retourner `{ url, confirmation_code }`.

3. **Implementer un endpoint public de statut**
   - Endpoint: `GET /api/facebook/data-deletion-status?id=<confirmation_code>`.
   - Renvoyer une page HTML simple et lisible avec statut (`processed`, `no_data`, `failed`, etc.).

## Portee

- `server/api/facebook/callback.get.ts`
- `server/api/facebook/data-deletion.post.ts`
- `server/api/facebook/data-deletion-status.get.ts`
- `server/utils/facebook-oauth.ts`
- `server/utils/facebook-pages-db.ts`
- `server/utils/facebook-signed-request.ts`
- `server/utils/facebook-data-deletion-db.ts`
- `.env.example` (documentation des URLs Meta)

## Alternatives considerees

1. **Option minimale (journal uniquement)**
   - + mise en place rapide
   - + reponse conforme au format Meta
   - - pas de suppression/revocation active possible sans ASID en base
   - - conformite fonctionnelle faible vis-a-vis de la suppression effective

2. **Option complete retenue (ASID + revocation active)**
   - + suppression/revocation effectivement executable depuis le callback
   - + tracabilite complete de la demande et de son traitement
   - - complexite supplementaire (nouveaux utilitaires et endpoints)
   - - dependance a une recolte ASID lors de la connexion OAuth

3. **Option complete + migration retroactive ASID**
   - + couverture des anciennes connexions sans nouvelle action utilisateur
   - - implementation plus risquee et moins fiable (best effort sur donnees historiques)
   - - scope non necessaire pour la mise en conformite immediate

## Consequences

Positives:

- Mise en conformite technique avec l'exigence Meta de callback de suppression et URL de suivi.
- Revocation active des Pages reliees a un utilisateur Facebook demandeur.
- Journalisation exploitable pour audit/support (`facebook_data_deletion_requests`).

Compromis:

- Les configurations historiques sans `connected_facebook_user_asid` ne sont pas revocables automatiquement tant qu'une reconnexion OAuth n'a pas eu lieu.
- Legere augmentation de complexite dans le domaine Facebook (parsing signed request, statut de workflow).

## Non-objectifs

- Mettre en place une migration retroactive automatique des anciennes configs Facebook.
- Introduire une interface BackOffice dediee au pilotage manuel des demandes de suppression.
- Couvrir d'autres providers OAuth (hors Facebook) dans ce chantier.

## Plan de migration (optionnel)

- [x] Ajouter le parsing/controle du `signed_request` Meta.
- [x] Etendre le callback OAuth pour persister `connected_facebook_user_asid`.
- [x] Ajouter l'endpoint `POST /api/facebook/data-deletion`.
- [x] Ajouter l'endpoint `GET /api/facebook/data-deletion-status`.
- [x] Documenter les URLs a renseigner dans `.env.example`.
- [ ] Communiquer en interne qu'une reconnexion OAuth est necessaire pour les anciennes configs sans ASID.
