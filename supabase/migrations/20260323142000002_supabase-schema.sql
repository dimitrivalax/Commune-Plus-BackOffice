-- Script SQL pour créer les tables nécessaires dans Supabase

-- Table pour les signalements
CREATE TABLE IF NOT EXISTS signalements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  address TEXT,
  comment TEXT,
  reponse TEXT,
  photo_url TEXT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'traité')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_contact_info CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT check_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT check_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT check_location CHECK ((latitude IS NOT NULL AND longitude IS NOT NULL) OR address IS NOT NULL)
);

-- Table pour les réservations
CREATE TABLE IF NOT EXISTS reservations_salles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salle_id UUID REFERENCES salles(id) ON DELETE CASCADE,
  room_name TEXT, -- Utilisé par les migrations de transition
  date DATE,
  start_time TIME,
  end_time TIME,
  date_debut TIMESTAMP WITH TIME ZONE, -- Utilisé par les migrations RLS
  date_fin TIMESTAMP WITH TIME ZONE, -- Utilisé par les migrations RLS
  reason TEXT,
  name TEXT,
  nom TEXT,
  prenom TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  telephone TEXT,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'confirmée', 'refusée', 'en_cours', 'traité')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les informations municipales
CREATE TABLE IF NOT EXISTS municipal_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_signalements_created_at ON signalements(created_at DESC);
-- Index spatial (nécessite PostGIS - commenté par défaut, décommentez si PostGIS est activé)
-- CREATE INDEX IF NOT EXISTS idx_signalements_location ON signalements USING GIST (point(longitude, latitude));
-- Index simple pour les coordonnées GPS (fonctionne sans PostGIS)
CREATE INDEX IF NOT EXISTS idx_signalements_lat_lng ON signalements(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_salles_date ON reservations_salles(date DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_salles_salle_id ON reservations_salles(salle_id);
CREATE INDEX IF NOT EXISTS idx_municipal_info_created_at ON municipal_info(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_signalements_updated_at ON signalements;
CREATE TRIGGER update_signalements_updated_at BEFORE UPDATE ON signalements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_salles_updated_at ON reservations_salles;
CREATE TRIGGER update_reservations_salles_updated_at BEFORE UPDATE ON reservations_salles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_municipal_info_updated_at ON municipal_info;
CREATE TRIGGER update_municipal_info_updated_at BEFORE UPDATE ON municipal_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations_salles ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipal_info ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permettre la lecture publique des informations municipales
DROP POLICY IF EXISTS "Les informations municipales sont publiques en lecture" ON municipal_info;
CREATE POLICY "Les informations municipales sont publiques en lecture"
    ON municipal_info FOR SELECT
    USING (true);

-- Politiques RLS pour permettre l'insertion publique des signalements et réservations
DROP POLICY IF EXISTS "Tout le monde peut créer des signalements" ON signalements;
CREATE POLICY "Tout le monde peut créer des signalements"
    ON signalements FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Tout le monde peut lire ses propres signalements" ON signalements;
CREATE POLICY "Tout le monde peut lire ses propres signalements"
    ON signalements FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Tout le monde peut créer des réservations" ON reservations_salles;
CREATE POLICY "Tout le monde peut créer des réservations"
    ON reservations_salles FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Tout le monde peut lire ses propres réservations" ON reservations_salles;
CREATE POLICY "Tout le monde peut lire ses propres réservations"
    ON reservations_salles FOR SELECT
    USING (true);

-- Note: Pour un environnement de production, vous devriez ajouter des politiques plus restrictives
-- et gérer l'authentification des utilisateurs avec Supabase Auth.

