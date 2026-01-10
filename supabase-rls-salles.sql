-- Script SQL pour créer la table salles dans Supabase
-- Cette table stocke les informations sur les salles municipales

-- Table pour les salles
CREATE TABLE IF NOT EXISTS salles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  nombre_max_places INTEGER NOT NULL CHECK (nombre_max_places > 0),
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les recherches par nom
CREATE INDEX IF NOT EXISTS idx_salles_nom ON salles(nom);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_salles_updated_at BEFORE UPDATE ON salles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_salles_created_at ON salles(created_at DESC);

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE salles ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permettre la lecture publique et l'écriture authentifiée
CREATE POLICY "Tout le monde peut lire les salles"
    ON salles FOR SELECT
    USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des salles"
    ON salles FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour les salles"
    ON salles FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les salles"
    ON salles FOR DELETE
    USING (auth.role() = 'authenticated');
