-- Script de migration pour ajouter le champ "reponse" à la table signalements
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne reponse (nullable pour les anciens signalements)
ALTER TABLE signalements
ADD COLUMN IF NOT EXISTS reponse TEXT;

-- Commentaire sur la colonne
COMMENT ON COLUMN signalements.reponse IS 'Réponse de la mairie au signalement';
