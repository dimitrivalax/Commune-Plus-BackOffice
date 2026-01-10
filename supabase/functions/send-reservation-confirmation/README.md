# Edge Function : Envoi d'email de confirmation de réservation

Cette Edge Function Supabase envoie un email de confirmation lorsqu'une réservation de salle est créée.

## Déploiement

Pour déployer cette fonction :

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref votre-project-ref

# Déployer la fonction
supabase functions deploy send-reservation-confirmation
```

## Configuration des secrets SMTP

Les secrets doivent être configurés dans le dashboard Supabase :

1. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** (⚙️) → **Edge Functions** → **Secrets**
4. Ajoutez les secrets suivants (s'ils n'existent pas déjà) :
   - `SMTP_HOST` : `mail.infomaniak.com`
   - `SMTP_PORT` : `465` (recommandé) ou `587`
   - `SMTP_USER` : Votre adresse email SMTP
   - `SMTP_PASSWORD` : Votre mot de passe SMTP
   - `SMTP_FROM_EMAIL` : Email expéditeur (peut être identique à SMTP_USER)

## Utilisation

Cette fonction est appelée automatiquement depuis l'endpoint `/api/reservations-salles/create` après la création d'une réservation.

### Données attendues

```json
{
  "email": "utilisateur@exemple.com",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "06 12 34 56 78",
  "nom_association": "Association XYZ",
  "date_debut": "2024-01-15T10:00:00Z",
  "date_fin": "2024-01-15T12:00:00Z",
  "salle_nom": "Salle des fêtes",
  "salle_adresse": "1 Rue de la Mairie"
}
```

## Format de l'email

L'email de confirmation contient :
- Un message de confirmation personnalisé
- Les détails de la réservation (salle, date, horaires)
- Les coordonnées du réservateur
- Un rappel important sur la réservation

L'email est envoyé en format HTML avec une version texte de secours.
