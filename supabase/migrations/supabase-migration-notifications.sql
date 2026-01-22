-- Script SQL pour créer la table notifications pour le BackOffice
-- Cette table stocke les notifications pour les nouveaux signalements et réservations

-- Table pour les notifications
CREATE TABLE IF NOT EXISTS backoffice_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('signalement', 'reservation')),
  entity_id UUID NOT NULL, -- ID du signalement ou de la réservation
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_type ON backoffice_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity_id ON backoffice_notifications(entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON backoffice_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON backoffice_notifications(created_at DESC);

-- Trigger pour créer une notification lors de la création d'un signalement
CREATE OR REPLACE FUNCTION create_signalement_notification()
RETURNS TRIGGER
SECURITY DEFINER -- S'exécute avec les permissions du propriétaire de la fonction
SET search_path = public
AS $$
BEGIN
  INSERT INTO backoffice_notifications (
    type,
    entity_id,
    title,
    message
  ) VALUES (
    'signalement',
    NEW.id,
    'Nouveau signalement',
    COALESCE(
      NEW.first_name || ' ' || NEW.last_name || ' a créé un nouveau signalement',
      'Un nouveau signalement a été créé'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_signalement_notification
  AFTER INSERT ON signalements
  FOR EACH ROW
  EXECUTE FUNCTION create_signalement_notification();

-- Trigger pour créer une notification lors de la création d'une réservation
CREATE OR REPLACE FUNCTION create_reservation_notification()
RETURNS TRIGGER
SECURITY DEFINER -- S'exécute avec les permissions du propriétaire de la fonction
SET search_path = public
AS $$
BEGIN
  INSERT INTO backoffice_notifications (
    type,
    entity_id,
    title,
    message
  ) VALUES (
    'reservation',
    NEW.id,
    'Nouvelle réservation',
    COALESCE(
      NEW.name || ' a demandé une réservation de salle',
      'Une nouvelle réservation a été demandée'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reservation_notification
  AFTER INSERT ON reservations_salles
  FOR EACH ROW
  EXECUTE FUNCTION create_reservation_notification();

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE backoffice_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour backoffice_notifications
-- Permettre la lecture aux utilisateurs authentifiés
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les notifications"
    ON backoffice_notifications FOR SELECT
    USING (true); -- Pour l'instant, permettre à tous les utilisateurs authentifiés

-- Permettre la mise à jour aux utilisateurs authentifiés (pour marquer comme lu)
CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour les notifications"
    ON backoffice_notifications FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Permettre l'insertion depuis les triggers (même si SECURITY DEFINER devrait suffire)
-- Cette politique permet aux triggers de créer des notifications
CREATE POLICY "Les triggers peuvent insérer des notifications"
    ON backoffice_notifications FOR INSERT
    WITH CHECK (true);

-- Commentaires
COMMENT ON TABLE backoffice_notifications IS 'Notifications pour le BackOffice (nouveaux signalements et réservations)';
COMMENT ON COLUMN backoffice_notifications.type IS 'Type de notification: signalement ou reservation';
COMMENT ON COLUMN backoffice_notifications.entity_id IS 'ID du signalement ou de la réservation concerné';
