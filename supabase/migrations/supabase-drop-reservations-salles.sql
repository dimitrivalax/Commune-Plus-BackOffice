-- Script SQL pour supprimer la table reservations_salles
-- Cette table n'est plus utilisée, toutes les réservations sont maintenant dans la table 'reservations'
--
-- ATTENTION: Exécutez ce script uniquement après avoir migré toutes les données vers la table 'reservations'
-- et vérifié que tout fonctionne correctement.

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent lire les réservations" ON reservations_salles;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des réservations" ON reservations_salles;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les réservations" ON reservations_salles;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer les réservations" ON reservations_salles;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS update_reservations_salles_updated_at ON reservations_salles;
DROP TRIGGER IF EXISTS check_reservation_overlap_trigger ON reservations_salles;

-- Supprimer la fonction de vérification de chevauchement
-- Note: Cette fonction est spécifique à reservations_salles, elle peut être supprimée
DROP FUNCTION IF EXISTS check_reservation_overlap();

-- Supprimer les index
DROP INDEX IF EXISTS idx_reservations_salles_salle_id;
DROP INDEX IF EXISTS idx_reservations_salles_date_debut;
DROP INDEX IF EXISTS idx_reservations_salles_date_fin;
DROP INDEX IF EXISTS idx_reservations_salles_dates;

-- Supprimer la table (CASCADE supprimera aussi les contraintes de clé étrangère)
DROP TABLE IF EXISTS reservations_salles CASCADE;
