# Templates d'email Supabase

Ce dossier contient les templates d'email pour l'authentification Supabase.

## Configuration dans Supabase

Pour utiliser ces templates dans votre projet Supabase :

1. Connectez-vous à votre [dashboard Supabase](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Email Templates**
4. Sélectionnez le template **Confirmation**
5. Copiez le contenu du fichier `confirmation.html` dans l'éditeur HTML
6. (Optionnel) Copiez le contenu du fichier `confirmation.txt` pour la version texte

## Variables disponibles

Les templates utilisent les variables suivantes de Supabase :

- `{{ .ConfirmationURL }}` - Lien de confirmation avec token
- `{{ .SiteURL }}` - URL de votre site
- `{{ .Email }}` - Adresse email de l'utilisateur
- `{{ .Token }}` - Token de confirmation (généralement dans l'URL)
- `{{ .TokenHash }}` - Hash du token
- `{{ .RedirectTo }}` - URL de redirection après confirmation
- `{{ .Year }}` - Année actuelle

## Personnalisation

Vous pouvez personnaliser ces templates en modifiant :
- Les couleurs (actuellement vert `#10b981` pour le bouton principal)
- Le logo (remplacez `/logo.png` par votre chemin de logo)
- Le texte et le style selon vos besoins

## Notes

- Les templates sont optimisés pour la compatibilité avec les clients email
- Le template HTML utilise des tableaux pour la mise en page (meilleure compatibilité)
- Les styles inline sont utilisés pour garantir l'affichage correct dans tous les clients email

