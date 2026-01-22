# Migrations Supabase

Ce dossier contient tous les scripts de migration SQL pour la base de données Supabase.

## Organisation

Les migrations sont organisées par type :
- **supabase-migration-*.sql** : Migrations principales (ajout de colonnes, tables, etc.)
- **supabase-rls-*.sql** : Migrations pour Row Level Security (RLS)
- **supabase-migrate-*.sql** : Migrations de données (transformation, renommage, etc.)
- **supabase-rename-*.sql** : Renommage de tables/colonnes
- **supabase-drop-*.sql** : Suppression de tables/colonnes
- **supabase-fix-*.sql** : Corrections de données

## Ordre d'exécution recommandé

### 1. Schéma de base (installation initiale)
1. `supabase-schema.sql` - Schéma complet de la base de données (tables principales)

### 2. Migrations de base
2. `supabase-migration-utilisateurs.sql` - Table utilisateurs
3. `supabase-migration-commune-id.sql` - Ajout des références aux communes
4. `supabase-migration-city-info.sql` - Table city_info (communes)
5. `supabase-migration-city-info-logo.sql` - Ajout du logo aux communes

### 3. Migrations des signalements
6. `supabase-migration-rename-table.sql` - Renommage de table (si nécessaire)
7. `supabase-migration-gps.sql` - Ajout du support GPS aux signalements
8. `supabase-migration-signalements-city-id.sql` - Liaison signalements-communes
9. `supabase-migration-add-reponse.sql` - Ajout du champ réponse aux signalements
10. `supabase-migration-add-archive-status.sql` - Ajout du statut archivé
11. `supabase-migration-signalements-user-id.sql` - Ajout user_id aux signalements

### 4. Migrations des fonctionnalités avancées
12. `supabase-migration-push-notifications.sql` - Table push_tokens
13. `supabase-migration-notifications.sql` - Table notifications BackOffice

### 5. Migrations RLS (Row Level Security)
14. `supabase-rls-signalements.sql` - RLS pour signalements
15. `supabase-rls-reservations-salles.sql` - RLS pour réservations
16. `supabase-rls-reservations.sql` - RLS pour réservations (ancienne version)
17. `supabase-rls-salles.sql` - RLS pour salles
18. `supabase-rls-municipal-info.sql` - RLS pour informations municipales

### 6. Corrections et fixes
19. `supabase-fix-city-info-table.sql` - Correction de la table city_info
20. `supabase-fix-city-info-rls.sql` - Correction RLS pour city_info
21. `supabase-fix-missing-salle-id.sql` - Correction des IDs de salles manquants

### 7. Migrations de données (si nécessaire)
22. `supabase-migrate-room-name-to-salle-id.sql` - Migration des noms de salles vers IDs
23. `supabase-migrate-room-name-to-salle-id-v2.sql` - Version 2 de la migration
24. `supabase-migrate-reservations-salles-to-reservations.sql` - Migration des réservations
25. `supabase-rename-reservations-to-reservations-salles.sql` - Renommage des réservations
26. `supabase-drop-reservations-salles.sql` - Suppression (attention : destructif)

### 8. Migrations génériques
27. `supabase-migration.sql` - Migration générique (vérifier le contenu avant exécution)

## Comment exécuter une migration

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier de migration
5. Cliquez sur **Run** pour exécuter

## Notes importantes

- ⚠️ **Attention** : Certaines migrations sont destructives (comme `supabase-drop-*.sql`)
- Vérifiez toujours le contenu d'une migration avant de l'exécuter
- Testez d'abord sur un environnement de développement
- Faites une sauvegarde de votre base de données avant d'exécuter des migrations importantes

## Vérification

Pour vérifier qu'une migration a été appliquée :

```sql
-- Vérifier qu'une table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'nom_de_la_table';

-- Vérifier qu'une colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nom_de_la_table' AND column_name = 'nom_de_la_colonne';

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%nom_du_trigger%';
```
