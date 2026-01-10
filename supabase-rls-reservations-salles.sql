-- Script SQL pour créer la table reservations_salles dans Supabase
-- Cette table stocke les réservations des salles municipales

-- Table pour les réservations de salles
CREATE TABLE IF NOT EXISTS reservations_salles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salle_id UUID NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  date_debut TIMESTAMP WITH TIME ZONE NOT NULL,
  date_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT NOT NULL,
  nom_association TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_date_order CHECK (date_fin > date_debut)
);

-- Index pour améliorer les recherches par salle
CREATE INDEX IF NOT EXISTS idx_reservations_salles_salle_id ON reservations_salles(salle_id);
-- Index pour améliorer les recherches par date
CREATE INDEX IF NOT EXISTS idx_reservations_salles_date_debut ON reservations_salles(date_debut);
CREATE INDEX IF NOT EXISTS idx_reservations_salles_date_fin ON reservations_salles(date_fin);

-- Index composite pour les vérifications de chevauchement
CREATE INDEX IF NOT EXISTS idx_reservations_salles_dates ON reservations_salles(salle_id, date_debut, date_fin);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_reservations_salles_updated_at BEFORE UPDATE ON reservations_salles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour vérifier les chevauchements de réservations
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier s'il existe une réservation qui chevauche pour la même salle
  IF EXISTS (
    SELECT 1 FROM reservations_salles
    WHERE salle_id = NEW.salle_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- La nouvelle réservation commence pendant une réservation existante
        (NEW.date_debut >= date_debut AND NEW.date_debut < date_fin)
        OR
        -- La nouvelle réservation se termine pendant une réservation existante
        (NEW.date_fin > date_debut AND NEW.date_fin <= date_fin)
        OR
        -- La nouvelle réservation englobe complètement une réservation existante
        (NEW.date_debut <= date_debut AND NEW.date_fin >= date_fin)
      )
  ) THEN
    RAISE EXCEPTION 'Une réservation existe déjà pour cette salle à cet horaire';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier les chevauchements avant insertion ou mise à jour
CREATE TRIGGER check_reservation_overlap_trigger
  BEFORE INSERT OR UPDATE ON reservations_salles
  FOR EACH ROW
  EXECUTE FUNCTION check_reservation_overlap();

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE reservations_salles ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permettre la lecture et l'écriture authentifiée
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les réservations"
    ON reservations_salles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des réservations"
    ON reservations_salles FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour les réservations"
    ON reservations_salles FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les réservations"
    ON reservations_salles FOR DELETE
    USING (auth.role() = 'authenticated');
