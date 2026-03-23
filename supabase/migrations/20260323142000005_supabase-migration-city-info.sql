-- Script SQL pour créer la table city_info dans Supabase
-- Cette table stocke les informations de configuration de la commune

-- Table pour les informations de la commune
CREATE TABLE IF NOT EXISTS city_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_city_info UNIQUE (id)
);

-- Index pour améliorer les recherches par nom et code postal
CREATE INDEX IF NOT EXISTS idx_city_info_name ON city_info(name);
CREATE INDEX IF NOT EXISTS idx_city_info_postal_code ON city_info(postal_code);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_city_info_updated_at ON city_info;
CREATE TRIGGER update_city_info_updated_at BEFORE UPDATE ON city_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_city_info_updated_at ON city_info(updated_at DESC);

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE city_info ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permettre la lecture et l'écriture publique
-- Note: Pour un environnement de production, vous devriez restreindre ces permissions
DROP POLICY IF EXISTS "Tout le monde peut lire les informations de la commune" ON city_info;
CREATE POLICY "Tout le monde peut lire les informations de la commune"
    ON city_info FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Tout le monde peut créer les informations de la commune" ON city_info;
CREATE POLICY "Tout le monde peut créer les informations de la commune"
    ON city_info FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les informations de la commune" ON city_info;
CREATE POLICY "Tout le monde peut mettre à jour les informations de la commune"
    ON city_info FOR UPDATE
    USING (true)
    WITH CHECK (true);

