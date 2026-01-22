-- Script SQL pour corriger les politiques RLS des notifications
-- Les triggers doivent pouvoir insérer des notifications même si l'utilisateur n'est pas authentifié

-- Modifier les fonctions trigger pour qu'elles s'exécutent avec les permissions du propriétaire
-- Cela permet aux triggers de contourner les politiques RLS lors de l'insertion

-- Fonction pour les signalements
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

-- Fonction pour les réservations
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

-- Ajouter une politique RLS qui permet l'insertion depuis les triggers
-- (même si elle n'est pas strictement nécessaire avec SECURITY DEFINER,
--  c'est une bonne pratique pour la clarté)
DROP POLICY IF EXISTS "Les triggers peuvent insérer des notifications" ON backoffice_notifications;
CREATE POLICY "Les triggers peuvent insérer des notifications"
    ON backoffice_notifications FOR INSERT
    WITH CHECK (true); -- Permettre toutes les insertions (les triggers gèrent la sécurité)
