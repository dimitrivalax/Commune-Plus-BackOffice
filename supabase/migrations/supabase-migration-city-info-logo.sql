-- Script SQL pour ajouter la colonne logo_url à la table city_info
-- Cette migration ajoute le support des logos de commune

-- Ajouter la colonne logo_url (nullable pour les anciennes entrées)
ALTER TABLE city_info 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Commentaire sur la colonne
COMMENT ON COLUMN city_info.logo_url IS 'URL du logo de la commune (peut être une URL externe ou un chemin relatif)';

