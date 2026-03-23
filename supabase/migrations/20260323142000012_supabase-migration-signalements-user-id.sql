-- Script SQL pour ajouter la colonne user_id dans la table signalements
-- Cette colonne permettra de lier les signalements aux tokens push pour envoyer des notifications

-- Ajouter la colonne user_id (nullable pour les anciens signalements)
ALTER TABLE signalements 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_signalements_user_id ON signalements(user_id);

-- Commentaire sur la colonne
COMMENT ON COLUMN signalements.user_id IS 'Identifiant utilisateur local (UUID) pour lier le signalement aux tokens push';
