-- Script SQL pour migrer les données de reservations_salles vers reservations
-- Exécutez ce script AVANT de supprimer la table reservations_salles
--
-- Ce script migre toutes les réservations de reservations_salles vers reservations
-- en convertissant les formats de données appropriés.

-- Migrer les données de reservations_salles vers reservations
INSERT INTO reservations (
  id,
  room_name,
  date,
  start_time,
  end_time,
  reason,
  name,
  email,
  phone,
  status,
  created_at,
  updated_at
)
SELECT
  rs.id,
  s.nom AS room_name,
  DATE(rs.date_debut) AS date,
  TO_CHAR(rs.date_debut, 'HH24:MI') AS start_time,
  TO_CHAR(rs.date_fin, 'HH24:MI') AS end_time,
  rs.nom_association AS reason,
  CONCAT(rs.prenom, ' ', rs.nom) AS name,
  rs.email,
  rs.telephone AS phone,
  'en_attente' AS status, -- Valeur par défaut, peut être modifiée manuellement après
  rs.created_at,
  rs.updated_at
FROM reservations_salles rs
INNER JOIN salles s ON rs.salle_id = s.id
WHERE NOT EXISTS (
  -- Éviter les doublons si une réservation avec le même ID existe déjà
  SELECT 1 FROM reservations r WHERE r.id = rs.id
)
ON CONFLICT (id) DO NOTHING;

-- Vérifier le nombre de réservations migrées
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM reservations
  WHERE id IN (SELECT id FROM reservations_salles);

  RAISE NOTICE 'Nombre de réservations migrées: %', migrated_count;
END $$;
