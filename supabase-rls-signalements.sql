-- Script SQL pour ajouter les politiques RLS permettant la mise à jour et la suppression
-- des signalements pour le backoffice (nécessite authentification) et l'application mobile (publique)

-- S'assurer que RLS est activé
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques UPDATE et DELETE si elles existent
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les signalements" ON signalements;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer les signalements" ON signalements;
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les signalements" ON signalements;
DROP POLICY IF EXISTS "Tout le monde peut supprimer les signalements" ON signalements;
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour ses propres signalements" ON signalements;

-- Politique pour permettre la mise à jour des signalements (uniquement pour les utilisateurs authentifiés - backoffice)
CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour les signalements"
    ON signalements FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique pour permettre la mise à jour publique des signalements (application mobile)
-- Permet à n'importe qui de mettre à jour un signalement (pour l'archivage depuis l'app mobile)
CREATE POLICY "Tout le monde peut mettre à jour les signalements"
    ON signalements FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Politique pour permettre la suppression des signalements (uniquement pour les utilisateurs authentifiés)
CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les signalements"
    ON signalements FOR DELETE
    USING (auth.role() = 'authenticated');

-- Note importante:
-- La politique UPDATE publique permet à l'application mobile d'archiver les signalements.
-- Pour un environnement de production, vous pourriez restreindre cette politique pour vérifier
-- que l'utilisateur met à jour son propre signalement (par exemple en vérifiant l'email).
-- La lecture et l'insertion restent publiques pour permettre aux citoyens de créer et consulter leurs signalements.
