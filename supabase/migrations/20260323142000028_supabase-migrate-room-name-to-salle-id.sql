-- Script SQL pour remplacer room_name par salle_id dans la table reservations_salles
--
-- Ce script :
-- 1. Ajoute la colonne salle_id (UUID avec référence à salles)
-- 2. Migre les données existantes en trouvant les IDs correspondants dans la table salles
-- 3. Supprime la colonne room_name
-- 4. Renomme l'index

-- Étape 1: Ajouter la colonne salle_id (nullable temporairement)
ALTER TABLE reservations_salles
ADD COLUMN IF NOT EXISTS salle_id UUID REFERENCES salles(id) ON DELETE CASCADE;

-- Étape 2: Migrer les données existantes
-- Mettre à jour salle_id en trouvant l'ID correspondant dans la table salles
UPDATE reservations_salles rs
SET salle_id = s.id
FROM salles s
WHERE LOWER(TRIM(rs.room_name)) = LOWER(TRIM(s.nom))
  AND rs.salle_id IS NULL;

-- Étape 3: Vérifier s'il reste des réservations sans salle_id
-- (afficher un avertissement si des données n'ont pas pu être migrées)
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM reservations_salles
  WHERE salle_id IS NULL;

  IF unmigrated_count > 0 THEN
    RAISE WARNING 'Il reste % réservations sans salle_id correspondante. Vérifiez les données avant de continuer.', unmigrated_count;
  END IF;
END $$;

-- Étape 4: Rendre la colonne salle_id NOT NULL (seulement si toutes les données sont migrées)
-- Décommentez cette ligne après avoir vérifié que toutes les données sont migrées :
-- ALTER TABLE reservations_salles ALTER COLUMN salle_id SET NOT NULL;

-- Étape 5: Supprimer l'ancien index sur room_name s'il existe
DROP INDEX IF EXISTS idx_reservations_salles_room_name;

-- Étape 6: Créer un index sur salle_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reservations_salles_salle_id ON reservations_salles(salle_id);

-- Étape 7: Supprimer la colonne room_name
-- ATTENTION: Décommentez cette ligne uniquement après avoir vérifié que tout fonctionne correctement
-- ALTER TABLE reservations_salles DROP COLUMN room_name;

-- Note: Après avoir vérifié que tout fonctionne, exécutez manuellement :
-- 1. ALTER TABLE reservations_salles ALTER COLUMN salle_id SET NOT NULL;
-- 2. ALTER TABLE reservations_salles DROP COLUMN room_name;
