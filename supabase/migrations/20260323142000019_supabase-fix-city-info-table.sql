-- Script SQL pour vérifier et corriger la table city_info
-- À exécuter si vous avez l'erreur "null value in column id"

-- Vérifier si la table existe et sa structure
DO $$
BEGIN
  -- Vérifier si la colonne id a bien un DEFAULT
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'city_info' 
    AND column_name = 'id'
    AND column_default IS NULL
  ) THEN
    -- Si l'id n'a pas de DEFAULT, l'ajouter
    ALTER TABLE city_info 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    RAISE NOTICE 'DEFAULT ajouté à la colonne id';
  ELSE
    RAISE NOTICE 'La colonne id a déjà un DEFAULT';
  END IF;
END $$;

-- Vérifier que la contrainte PRIMARY KEY existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'city_info' 
    AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE city_info 
    ADD PRIMARY KEY (id);
    
    RAISE NOTICE 'Clé primaire ajoutée';
  ELSE
    RAISE NOTICE 'Clé primaire existe déjà';
  END IF;
END $$;



