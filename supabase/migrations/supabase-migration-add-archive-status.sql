-- Script de migration pour ajouter le statut "archive" aux signalements
-- À exécuter dans Supabase SQL Editor

-- Supprimer toutes les anciennes contraintes CHECK de statut si elles existent
ALTER TABLE signalements
DROP CONSTRAINT IF EXISTS signalements_status_check;

ALTER TABLE signalements
DROP CONSTRAINT IF EXISTS incivilities_status_check;

-- Trouver et supprimer toutes les contraintes CHECK sur la colonne status
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'signalements'::regclass
        AND contype = 'c'
        AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE signalements DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Ajouter la nouvelle contrainte CHECK avec le statut "archive"
ALTER TABLE signalements
ADD CONSTRAINT signalements_status_check
CHECK (status IN ('en_attente', 'en_cours', 'traite', 'archive'));

-- Note: Si vous avez encore "traité" avec accent dans vos données,
-- vous devrez peut-être d'abord mettre à jour les données existantes :
-- UPDATE signalements SET status = 'traite' WHERE status = 'traité';
