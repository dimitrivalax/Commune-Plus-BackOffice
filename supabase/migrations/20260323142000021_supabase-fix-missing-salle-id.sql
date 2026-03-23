-- Script SQL pour identifier et corriger les réservations sans salle_id
-- Sécurité : s'assurer que room_name existe si 016 a été appliqué partiellement
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservations_salles') THEN
        ALTER TABLE reservations_salles ADD COLUMN IF NOT EXISTS room_name TEXT;
    END IF;
END $$;

-- Étape 1: Voir les réservations sans salle_id
SELECT
  id,
  room_name,
  date,
  name,
  email,
  created_at
FROM reservations_salles
WHERE salle_id IS NULL
ORDER BY created_at DESC;

-- Étape 2: Voir toutes les salles disponibles pour comparaison
SELECT
  id,
  nom,
  adresse,
  commune_id
FROM salles
ORDER BY nom;

-- Étape 3: Essayer de migrer avec une correspondance plus flexible
-- (en ignorant les espaces en début/fin et en comparant sans tenir compte de la casse)
UPDATE reservations_salles rs
SET salle_id = s.id
FROM salles s
WHERE rs.salle_id IS NULL
  AND LOWER(TRIM(rs.room_name)) = LOWER(TRIM(s.nom));

-- Étape 4: Vérifier à nouveau combien de réservations n'ont toujours pas de salle_id
SELECT COUNT(*) as count_without_salle_id
FROM reservations_salles
WHERE salle_id IS NULL;

-- Étape 5: Si des réservations restent sans salle_id, vous avez plusieurs options :

-- Option A: Supprimer les réservations sans salle_id correspondante
-- (DÉCOMMENTEZ UNIQUEMENT SI VOUS ÊTES SÛR DE VOULOIR SUPPRIMER CES DONNÉES)
-- DELETE FROM reservations_salles WHERE salle_id IS NULL;

-- Option B: Créer une salle "Inconnue" pour les réservations sans correspondance
-- (DÉCOMMENTEZ ET ADAPTEZ SELON VOS BESOINS)
-- INSERT INTO salles (nom, adresse, nombre_max_places, description)
-- VALUES ('Salle inconnue', 'Adresse non spécifiée', 0, 'Salle créée automatiquement pour les réservations sans correspondance')
-- ON CONFLICT DO NOTHING;
--
-- UPDATE reservations_salles rs
-- SET salle_id = (SELECT id FROM salles WHERE nom = 'Salle inconnue' LIMIT 1)
-- WHERE rs.salle_id IS NULL;

-- Option C: Mettre à jour manuellement les réservations restantes
-- (Remplacez 'UUID_DE_LA_SALLE' par l'ID réel de la salle)
-- UPDATE reservations_salles
-- SET salle_id = 'UUID_DE_LA_SALLE'
-- WHERE room_name = 'NOM_DE_LA_SALLE' AND salle_id IS NULL;

-- Après avoir corrigé toutes les réservations, vous pouvez exécuter :
-- ALTER TABLE reservations_salles ALTER COLUMN salle_id SET NOT NULL;
