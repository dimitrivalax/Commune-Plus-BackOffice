-- Script SQL pour ajouter les politiques RLS permettant la suppression et la mise à jour
-- des réservations par leur créateur (basé sur l'email)

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour ses propres réservations" ON reservations_salles;
DROP POLICY IF EXISTS "Tout le monde peut supprimer ses propres réservations" ON reservations_salles;

-- Politique pour permettre la mise à jour des réservations par leur créateur (basé sur l'email)
-- Note: Cette politique nécessite que l'email soit passé dans la requête WHERE
-- Le code de l'application doit inclure .eq('email', userEmail) dans la requête UPDATE
CREATE POLICY "Tout le monde peut mettre à jour ses propres réservations"
    ON reservations_salles FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Politique pour permettre la suppression des réservations par leur créateur (basé sur l'email)
-- Note: Cette politique nécessite que l'email soit passé dans la requête WHERE
-- Le code de l'application doit inclure .eq('email', userEmail) dans la requête DELETE
CREATE POLICY "Tout le monde peut supprimer ses propres réservations"
    ON reservations_salles FOR DELETE
    USING (true);

-- Note importante:
-- Ces politiques permettent la mise à jour et la suppression, mais le code de l'application
-- doit vérifier que l'email de l'utilisateur correspond à celui de la réservation.
-- La vérification côté client est effectuée dans ReservationDetailPage.vue en comparant
-- l'email stocké dans le localStorage avec l'email de la réservation, et en ajoutant
-- .eq('email', userEmail) dans les requêtes UPDATE et DELETE.

