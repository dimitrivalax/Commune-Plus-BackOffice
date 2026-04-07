-- Notification back-office pour les nouvelles réservations :
-- message exploitable avec nom/prénom OU champ name, et recréation du trigger
-- (certaines bases n’avaient pas le trigger ou seulement nom/prenom sans name).

CREATE OR REPLACE FUNCTION create_reservation_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  display_name text;
BEGIN
  display_name := TRIM(CONCAT_WS(' ', NEW.prenom, NEW.nom));
  IF display_name IS NULL OR display_name = '' THEN
    display_name := NULLIF(TRIM(COALESCE(NEW.name, '')), '');
  END IF;
  IF display_name IS NULL OR display_name = '' THEN
    display_name := 'Une personne';
  END IF;

  INSERT INTO backoffice_notifications (
    type,
    entity_id,
    title,
    message
  ) VALUES (
    'reservation',
    NEW.id,
    'Nouvelle réservation',
    display_name || ' a demandé une réservation de salle'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reservation_notification ON reservations_salles;
CREATE TRIGGER trigger_reservation_notification
  AFTER INSERT ON reservations_salles
  FOR EACH ROW
  EXECUTE FUNCTION create_reservation_notification();
