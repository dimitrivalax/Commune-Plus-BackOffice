# Système de Notifications BackOffice

Ce guide explique le système de notifications pour le BackOffice qui alerte les administrateurs des nouveaux signalements et réservations.

## Prérequis

1. Supabase configuré et accessible
2. Les tables `signalements` et `reservations_salles` doivent exister

## Installation

### 1. Exécuter la migration SQL

Exécutez la migration SQL dans l'éditeur SQL de Supabase :

```sql
-- Le contenu du fichier supabase-migration-notifications.sql
```

Cette migration crée :
- La table `backoffice_notifications` pour stocker les notifications
- Des triggers automatiques qui créent des notifications lors de la création de signalements ou réservations
- Les index nécessaires pour les performances
- Les politiques RLS pour la sécurité

### 2. Vérifier l'installation

Après l'exécution de la migration, vérifiez que :
- La table `backoffice_notifications` existe
- Les triggers `trigger_signalement_notification` et `trigger_reservation_notification` sont créés

```sql
-- Vérifier la table
SELECT * FROM backoffice_notifications LIMIT 10;

-- Vérifier les triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%notification%';
```

## Fonctionnement

### Création automatique des notifications

Les notifications sont créées automatiquement via des triggers SQL :

1. **Nouveau signalement** : Quand un signalement est créé dans la table `signalements`, une notification est automatiquement créée avec :
   - Type : `signalement`
   - Titre : "Nouveau signalement"
   - Message : Nom de la personne qui a créé le signalement

2. **Nouvelle réservation** : Quand une réservation est créée dans la table `reservations_salles`, une notification est automatiquement créée avec :
   - Type : `reservation`
   - Titre : "Nouvelle réservation"
   - Message : Nom de la personne qui a demandé la réservation

### Affichage des notifications

Les notifications sont affichées dans le composant `NotificationsSlideover` qui :
- Affiche toutes les notifications (non lues en premier)
- Montre un badge avec le nombre de notifications non lues
- Permet de cliquer sur une notification pour naviguer vers la page correspondante
- Marque automatiquement la notification comme lue lors du clic

### API Endpoints

#### GET `/api/notifications`
Récupère toutes les notifications (limitées à 50, triées par date décroissante).

**Réponse :**
```json
[
  {
    "id": "uuid",
    "unread": true,
    "sender": {
      "name": "Signalement",
      "avatar": {
        "icon": "i-lucide-alert-circle"
      }
    },
    "body": "Jean Dupont a créé un nouveau signalement",
    "date": "2024-01-15T10:30:00Z",
    "type": "signalement",
    "entity_id": "uuid-du-signalement",
    "title": "Nouveau signalement"
  }
]
```

#### PUT `/api/notifications/[id]/read`
Marque une notification comme lue.

**Réponse :**
```json
{
  "success": true,
  "notification": { ... }
}
```

## Navigation

Quand un utilisateur clique sur une notification :
- **Signalement** → Redirige vers `/signalements`
- **Réservation** → Redirige vers `/reservations-salles`

## Personnalisation

### Modifier les messages de notification

Pour modifier les messages des notifications, éditez les fonctions SQL dans la migration :

```sql
CREATE OR REPLACE FUNCTION create_signalement_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO backoffice_notifications (
    type,
    entity_id,
    title,
    message
  ) VALUES (
    'signalement',
    NEW.id,
    'Nouveau signalement', -- Modifier ici
    COALESCE(
      NEW.first_name || ' ' || NEW.last_name || ' a créé un nouveau signalement', -- Modifier ici
      'Un nouveau signalement a été créé'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Ajouter d'autres types de notifications

Pour ajouter d'autres types de notifications (par exemple, pour les informations municipales) :

1. Ajouter le nouveau type dans la contrainte CHECK :
```sql
ALTER TABLE backoffice_notifications
DROP CONSTRAINT IF EXISTS backoffice_notifications_type_check;

ALTER TABLE backoffice_notifications
ADD CONSTRAINT backoffice_notifications_type_check
CHECK (type IN ('signalement', 'reservation', 'municipal_info'));
```

2. Créer un nouveau trigger pour le nouveau type
3. Mettre à jour le composant `NotificationsSlideover.vue` pour gérer la navigation

## Dépannage

### Les notifications ne sont pas créées

1. Vérifiez que les triggers existent :
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%notification%';
```

2. Vérifiez les logs Supabase pour les erreurs de triggers

3. Testez manuellement la création d'une notification :
```sql
INSERT INTO backoffice_notifications (type, entity_id, title, message)
VALUES ('signalement', 'test-id', 'Test', 'Message de test');
```

### Les notifications ne s'affichent pas

1. Vérifiez que l'API `/api/notifications` fonctionne
2. Vérifiez la console du navigateur pour les erreurs
3. Vérifiez que l'utilisateur est authentifié (les notifications nécessitent une authentification)

### Les notifications ne se marquent pas comme lues

1. Vérifiez que l'endpoint `/api/notifications/[id]/read` est accessible
2. Vérifiez que l'utilisateur a les permissions de mise à jour (RLS)
3. Vérifiez la console du navigateur pour les erreurs

## Maintenance

### Nettoyer les anciennes notifications

Pour supprimer les notifications de plus de 30 jours :

```sql
DELETE FROM backoffice_notifications
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Statistiques

Pour voir le nombre de notifications par type :

```sql
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = false) as unread
FROM backoffice_notifications
GROUP BY type;
```
