-- Script SQL pour ajouter la liaison entre signalements et city_info
-- Cette migration ajoute une colonne city_id dans la table signalements

-- Ajouter la colonne city_id (nullable pour les anciens signalements)
ALTER TABLE signalements 
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES city_info(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_signalements_city_id ON signalements(city_id);

-- Commentaire sur la colonne
COMMENT ON COLUMN signalements.city_id IS 'Référence à la commune associée au signalement';

