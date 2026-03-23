-- Script de migration pour remplacer le champ address par les coordonnées GPS
-- À exécuter si vous avez déjà créé la table signalements avec le champ address
-- Note: Si votre table s'appelle encore "incivilities", exécutez d'abord supabase-migration-rename-table.sql

-- Ajouter les nouvelles colonnes GPS et adresse
ALTER TABLE signalements 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Si vous avez des données existantes avec des adresses, vous pouvez les convertir en coordonnées GPS
-- en utilisant un service de géocodage. Pour l'instant, on laisse latitude et longitude NULL
-- pour les anciennes données.

-- Pour les nouvelles données, rendre latitude et longitude obligatoires
-- Note: Cette commande peut échouer si des lignes existent déjà sans ces valeurs
-- Dans ce cas, vous devrez d'abord remplir les données existantes ou les supprimer
-- ALTER TABLE signalements
-- ALTER COLUMN latitude SET NOT NULL,
-- ALTER COLUMN longitude SET NOT NULL;

-- Ajouter les contraintes de validation pour les coordonnées GPS
ALTER TABLE signalements
DROP CONSTRAINT IF EXISTS check_latitude;

ALTER TABLE signalements
ADD CONSTRAINT check_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE signalements
DROP CONSTRAINT IF EXISTS check_longitude;

ALTER TABLE signalements
ADD CONSTRAINT check_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Créer un index spatial pour les recherches géographiques (nécessite l'extension PostGIS)
-- Si vous n'avez pas PostGIS, vous pouvez utiliser un index B-tree simple
CREATE INDEX IF NOT EXISTS idx_signalements_location ON signalements(latitude, longitude);

-- Ajouter la contrainte pour s'assurer qu'au moins GPS ou adresse est renseigné
ALTER TABLE signalements
DROP CONSTRAINT IF EXISTS check_location;

ALTER TABLE signalements
ADD CONSTRAINT check_location CHECK ((latitude IS NOT NULL AND longitude IS NOT NULL) OR address IS NOT NULL);

