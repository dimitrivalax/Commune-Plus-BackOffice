-- Script SQL pour ajouter la colonne logo_url à la table commune
-- Cette migration corrige l'ajout initial qui ciblait la mauvaise table (city_info)

ALTER TABLE commune ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN commune.logo_url IS 'URL du logo de la commune';
