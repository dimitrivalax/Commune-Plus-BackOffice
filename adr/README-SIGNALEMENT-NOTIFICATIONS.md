# Notifications Push pour les Signalements

Ce guide explique comment configurer les notifications push pour les signalements.

## Prérequis

1. Les notifications push doivent être configurées (voir `PUSH_NOTIFICATIONS_SETUP.md`)
2. La migration SQL doit être exécutée dans Supabase

## Migration SQL

Pour activer les notifications push pour les signalements, vous devez exécuter la migration SQL suivante dans l'éditeur SQL de Supabase :

```sql
-- Script SQL pour ajouter la colonne user_id dans la table signalements
-- Cette colonne permettra de lier les signalements aux tokens push pour envoyer des notifications

-- Ajouter la colonne user_id (nullable pour les anciens signalements)
ALTER TABLE signalements 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_signalements_user_id ON signalements(user_id);

-- Commentaire sur la colonne
COMMENT ON COLUMN signalements.user_id IS 'Identifiant utilisateur local (UUID) pour lier le signalement aux tokens push';
```

### Comment exécuter la migration

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase-migration-signalements-user-id.sql`
5. Cliquez sur **Run** pour exécuter la migration

## Fonctionnement

### Création d'un signalement

Lorsqu'un utilisateur crée un signalement depuis l'application mobile :
- Un `user_id` unique est généré et stocké localement (si ce n'est pas déjà fait)
- Ce `user_id` est associé au signalement lors de sa création
- Le `user_id` est également utilisé pour associer les tokens push à l'utilisateur

### Notification lors d'un changement de statut

Quand un administrateur modifie le statut d'un signalement dans le BackOffice :
- Une notification push est automatiquement envoyée à l'utilisateur qui a créé le signalement
- Le titre de la notification est : "Mise à jour de votre signalement"
- Le corps indique le nouveau statut (En Attente, En Cours, Traité, Archivé)

### Notification lors d'une réponse

Quand un administrateur ajoute ou modifie la réponse à un signalement dans le BackOffice :
- Une notification push est automatiquement envoyée à l'utilisateur qui a créé le signalement
- Le titre de la notification est : "Réponse à votre signalement"
- Le corps indique qu'une réponse a été ajoutée

### Navigation depuis la notification

Lorsque l'utilisateur clique sur une notification :
- L'application s'ouvre (même si elle était fermée)
- L'utilisateur est automatiquement redirigé vers la page de détail du signalement concerné

## Dépannage

### Erreur : "Could not find the 'user_id' column"

Si vous voyez cette erreur lors de la création d'un signalement :
1. Vérifiez que la migration SQL a bien été exécutée
2. Vérifiez que la colonne `user_id` existe dans la table `signalements` :
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'signalements' AND column_name = 'user_id';
   ```
3. Si la colonne n'existe pas, exécutez la migration SQL

### Les notifications ne sont pas envoyées

1. Vérifiez que FCM est correctement configuré (voir `PUSH_NOTIFICATIONS_SETUP.md`)
2. Vérifiez que l'utilisateur a bien un `user_id` associé à son signalement
3. Vérifiez que l'utilisateur a des tokens push actifs dans la table `push_tokens`
4. Consultez les logs du serveur pour voir les erreurs éventuelles

### Les anciens signalements n'ont pas de user_id

C'est normal. Les signalements créés avant l'exécution de la migration n'auront pas de `user_id`. 
- Ces signalements ne recevront pas de notifications push
- Seuls les nouveaux signalements créés après la migration recevront des notifications
