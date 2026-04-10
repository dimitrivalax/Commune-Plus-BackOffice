# Analytics mobile RGPD - taxonomie d'evenements

Ce document definit la taxonomie d'evenements mobile a utiliser dans PostHog pour la page
Statistiques BackOffice.

## Principes RGPD

- Aucune donnee personnelle directe n'est envoyee dans les evenements:
  - interdit: email, prenom, nom, telephone, adresse
- Identifiants autorises:
  - `commune_id`
  - `actualite_id`, `proposition_id`, `signalement_id`
  - `notification_id` / `campaign_key`
- Plateformes suivies pour les statistiques mobiles:
  - `platform = ios|android`

## Evenements

### `actualite_viewed`

- Quand: ouverture d'une actualite dans la page detail mobile
- Proprietes:
  - `actualite_id` (string)
  - `commune_id` (string, si connu)
  - `platform` (string)
  - `source` (`detail_page_initial` | `detail_page_swipe`)

### `proposition_viewed`

- Quand: premiere ouverture du detail d'une proposition mobile
- Proprietes:
  - `proposition_id` (string)
  - `commune_id` (string, si connu)
  - `platform` (string)
  - `source` (`detail_page`)

### `signalement_submitted`

- Quand: soumission d'un signalement mobile
- Proprietes:
  - `signalement_id` (string, si disponible)
  - `commune_id` (string, si connu)
  - `platform` (string)

### `notification_sent`

- Quand: envoi d'une notification push depuis le serveur
- Proprietes:
  - `notification_id` (string)
  - `campaign_key` (string)
  - `target_type` (`actualite|proposition|signalement|reservation|other`)
  - `target_id` (string)
  - `commune_id` (string, si connu)
  - `sent_count` (number)
  - `platform` (`ios|android|mixed`)

### `notification_clicked`

- Quand: clic utilisateur sur une notification push mobile
- Proprietes:
  - `notification_id` (string)
  - `campaign_key` (string)
  - `target_type` (`actualite|proposition|signalement|reservation|other`)
  - `target_id` (string)
  - `commune_id` (string, si connu)
  - `platform` (string)
  - `source` (`push_action`)

