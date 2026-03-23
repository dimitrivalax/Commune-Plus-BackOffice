# Edge Function : Envoi d'email de signalement

Cette Edge Function envoie automatiquement un email à la mairie lorsqu'un signalement est créé dans l'application Commune Plus.

## Déploiement

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier le projet (remplacez votre-project-ref par votre référence de projet)
supabase link --project-ref votre-project-ref

# Déployer la fonction
supabase functions deploy send-signalement-email
```

## Configuration des secrets Resend

Cette fonction utilise [Resend](https://resend.com) pour l'envoi d'emails. Les secrets doivent être configurés dans le dashboard Supabase :

1. Créez un compte sur [Resend](https://resend.com) si vous n'en avez pas déjà un
2. Obtenez votre clé API depuis le [dashboard Resend](https://resend.com/api-keys)
3. Configurez un domaine vérifié dans Resend (ou utilisez le domaine de test `onboarding@resend.dev` pour les tests)
4. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
5. Sélectionnez votre projet
6. Allez dans **Settings** → **Edge Functions** → **Secrets**
7. Ajoutez les secrets suivants :
   - `RESEND_API_KEY` : Votre clé API Resend (commence par `re_`)
   - `RESEND_FROM_EMAIL` : Email expéditeur (doit être un domaine vérifié dans Resend, par défaut: `noreply@commune-plus.fr`)

**Note** : Pour la production, vous devez vérifier votre domaine dans Resend. Consultez la [documentation Resend](https://resend.com/docs/dashboard/domains/introduction) pour plus d'informations.

## Utilisation

La fonction est appelée automatiquement depuis `NewSignalementPage.vue` après la création d'un signalement.

Elle attend les données suivantes dans le body de la requête :

```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "commune": "Venerque",
  "description": "Description du signalement",
  "photoUrl": "https://res.cloudinary.com/...",
  "mairieEmail": "mairie@Venerque.fr"
}
```

## Format de l'email

L'email envoyé contient :

- **Objet** : "Signalement automatique via Commune Plus"
- **Corps HTML** : Message formaté avec les informations du signalement
- **Corps texte** : Version texte de l'email
- **Photo** : URL de la photo du signalement (si disponible) incluse dans le corps de l'email
- **Reply-To** : Email de l'utilisateur (si fourni) pour permettre à la mairie de répondre directement
