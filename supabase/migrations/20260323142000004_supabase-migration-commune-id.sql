-- Script SQL pour ajouter les colonnes commune_id aux tables salles et municipal_info
-- Ce script doit être exécuté dans l'éditeur SQL de Supabase

-- Ajouter la colonne commune_id à la table salles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'salles'
    AND column_name = 'commune_id'
  ) THEN
    ALTER TABLE salles ADD COLUMN IF NOT EXISTS commune_id UUID REFERENCES commune(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_salles_commune_id ON salles(commune_id);
    COMMENT ON COLUMN salles.commune_id IS 'Référence à la commune associée à la salle';
  END IF;
END $$;

-- Ajouter la colonne commune_id à la table municipal_info si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'municipal_info'
    AND column_name = 'commune_id'
  ) THEN
    ALTER TABLE municipal_info ADD COLUMN IF NOT EXISTS commune_id UUID REFERENCES commune(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_municipal_info_commune_id ON municipal_info(commune_id);
    COMMENT ON COLUMN municipal_info.commune_id IS 'Référence à la commune associée à l''information municipale';
  END IF;
END $$;

-- Mettre à jour la colonne city_id de signalements pour référencer commune au lieu de city_info
-- (si city_info a été renommée en commune)
DO $$
BEGIN
  -- Vérifier si la colonne city_id existe et référence city_info
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'signalements'
    AND column_name = 'city_id'
  ) THEN
    -- Vérifier si la contrainte de clé étrangère existe
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'signalements'
      AND constraint_name LIKE '%city_id%'
      AND constraint_type = 'FOREIGN KEY'
    ) THEN
      -- Supprimer l'ancienne contrainte si elle référence city_info
      ALTER TABLE signalements DROP CONSTRAINT IF EXISTS signalements_city_id_fkey;
      -- Ajouter la nouvelle contrainte référençant commune
      ALTER TABLE signalements ADD CONSTRAINT signalements_city_id_fkey
        FOREIGN KEY (city_id) REFERENCES commune(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
