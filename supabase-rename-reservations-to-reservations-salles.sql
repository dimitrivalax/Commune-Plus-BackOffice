-- Script SQL pour renommer la table reservations en reservations_salles
--
-- Ce script renomme la table 'reservations' en 'reservations_salles'
-- pour unifier le nom de la table dans tout le système.

-- Renommer la table
ALTER TABLE reservations RENAME TO reservations_salles;

-- Renommer les index existants (si nécessaire)
-- Note: Les index seront automatiquement renommés avec la table dans PostgreSQL
-- mais on peut les renommer explicitement pour plus de clarté

-- Vérifier et renommer les index si nécessaire
DO $$
BEGIN
  -- Note: L'index sur room_name sera supprimé lors de la migration vers salle_id

  -- Renommer l'index sur date si il existe
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservations_date') THEN
    ALTER INDEX idx_reservations_date RENAME TO idx_reservations_salles_date;
  END IF;

  -- Renommer l'index sur created_at si il existe
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservations_created_at') THEN
    ALTER INDEX idx_reservations_created_at RENAME TO idx_reservations_salles_created_at;
  END IF;
END $$;

-- Renommer les triggers (ils seront automatiquement mis à jour, mais on peut les renommer explicitement)
DO $$
BEGIN
  -- Renommer le trigger updated_at si il existe
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reservations_updated_at') THEN
    ALTER TRIGGER update_reservations_updated_at ON reservations_salles RENAME TO update_reservations_salles_updated_at;
  END IF;
END $$;

-- Note: Les politiques RLS seront automatiquement mises à jour avec le nouveau nom de table
-- Les fonctions existantes continueront de fonctionner car elles référencent la table par son nom
