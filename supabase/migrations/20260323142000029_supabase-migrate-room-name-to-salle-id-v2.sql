-- Script SQL amélioré pour remplacer room_name par salle_id dans la table reservations_salles
--
-- Ce script :
-- 1. Ajoute la colonne salle_id (UUID avec référence à salles)
-- 2. Migre les données existantes avec plusieurs tentatives de correspondance
-- 3. Gère les cas où aucune correspondance n'est trouvée
-- 4. Supprime la colonne room_name après vérification

-- Étape 1: Ajouter la colonne salle_id (nullable temporairement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'reservations_salles'
    AND column_name = 'salle_id'
  ) THEN
    ALTER TABLE reservations_salles
    ADD COLUMN IF NOT EXISTS salle_id UUID REFERENCES salles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Étape 2: Migrer les données existantes - Tentative 1: Correspondance exacte (sans espaces, sans casse)
UPDATE reservations_salles rs
SET salle_id = s.id
FROM salles s
WHERE LOWER(TRIM(rs.room_name)) = LOWER(TRIM(s.nom))
  AND rs.salle_id IS NULL;

-- Étape 3: Vérifier combien de réservations n'ont toujours pas de salle_id
DO $$
DECLARE
  unmigrated_count INTEGER;
  total_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM reservations_salles
  WHERE salle_id IS NULL;

  SELECT COUNT(*) INTO total_count
  FROM reservations_salles;

  RAISE NOTICE 'Migration terminée: % réservations sur % ont été migrées',
    (total_count - unmigrated_count), total_count;

  IF unmigrated_count > 0 THEN
    RAISE WARNING 'Il reste % réservations sans salle_id correspondante. Exécutez supabase-fix-missing-salle-id.sql pour les identifier et les corriger.', unmigrated_count;

    -- Afficher les réservations problématiques
    RAISE NOTICE 'Réservations sans correspondance:';
    FOR rec IN
      SELECT id, room_name, date, name, email
      FROM reservations_salles
      WHERE salle_id IS NULL
      LIMIT 10
    LOOP
      RAISE NOTICE '  - ID: %, Room: %, Date: %, Name: %',
        rec.id, rec.room_name, rec.date, rec.name;
    END LOOP;
  END IF;
END $$;

-- Étape 4: Supprimer l'ancien index sur room_name s'il existe
DROP INDEX IF EXISTS idx_reservations_salles_room_name;

-- Étape 5: Créer un index sur salle_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reservations_salles_salle_id ON reservations_salles(salle_id);

-- Note importante:
-- Avant de rendre salle_id NOT NULL et de supprimer room_name, vous DEVEZ :
-- 1. Vérifier qu'il n'y a plus de réservations avec salle_id NULL
-- 2. Exécuter le script supabase-fix-missing-salle-id.sql pour identifier et corriger les cas restants
-- 3. Une fois toutes les réservations migrées, exécuter :
--    ALTER TABLE reservations_salles ALTER COLUMN salle_id SET NOT NULL;
--    ALTER TABLE reservations_salles DROP COLUMN room_name;
