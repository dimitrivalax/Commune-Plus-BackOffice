-- Script de migration pour ajouter les nouveaux champs à la table signalements
-- À exécuter si vous avez déjà créé la table signalements
-- Note: Si votre table s'appelle encore "incivilities", exécutez d'abord supabase-migration-rename-table.sql

-- Ajouter les nouvelles colonnes
ALTER TABLE signalements 
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Mettre à jour les contraintes pour rendre last_name et first_name obligatoires
-- Note: Cette commande peut échouer si des lignes existent déjà sans ces valeurs
-- Dans ce cas, vous devrez d'abord remplir les données existantes
ALTER TABLE signalements
ALTER COLUMN last_name SET NOT NULL,
ALTER COLUMN first_name SET NOT NULL;

-- Ajouter la contrainte pour s'assurer qu'au moins email ou phone est renseigné
ALTER TABLE signalements
DROP CONSTRAINT IF EXISTS check_contact_info;

ALTER TABLE signalements
ADD CONSTRAINT check_contact_info CHECK (email IS NOT NULL OR phone IS NOT NULL);


