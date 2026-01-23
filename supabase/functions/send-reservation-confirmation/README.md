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

## Configuration des secrets Resend

Cette fonction utilise [Resend](https://resend.com) pour l'envoi d'emails. Les secrets doivent être configurés dans le dashboard Supabase :

1. Créez un compte sur [Resend](https://resend.com) si vous n'en avez pas déjà un
2. Obtenez votre clé API depuis le [dashboard Resend](https://resend.com/api-keys)
3. Configurez un domaine vérifié dans Resend (ou utilisez le domaine de test `onboarding@resend.dev` pour les tests)
4. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
5. Sélectionnez votre projet
6. Allez dans **Settings** (⚙️) → **Edge Functions** → **Secrets**
7. Ajoutez les secrets suivants :
   - `RESEND_API_KEY` : Votre clé API Resend (commence par `re_`)
   - `RESEND_FROM_EMAIL` : Email expéditeur (doit être un domaine vérifié dans Resend, par défaut: `noreply@commune-plus.fr`)

**Note** : Pour la production, vous devez vérifier votre domaine dans Resend. Consultez la [documentation Resend](https://resend.com/docs/dashboard/domains/introduction) pour plus d'informations.

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
