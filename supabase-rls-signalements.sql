-- Script SQL pour ajouter les politiques RLS permettant la mise à jour et la suppression
-- des signalements pour le backoffice (nécessite authentification)

-- S'assurer que RLS est activé
ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques UPDATE et DELETE si elles existent
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les signalements" ON signalements;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer les signalements" ON signalements;
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les signalements" ON signalements;
DROP POLICY IF EXISTS "Tout le monde peut supprimer les signalements" ON signalements;

-- Politique pour permettre la mise à jour des signalements (uniquement pour les utilisateurs authentifiés)
CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour les signalements"
    ON signalements FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique pour permettre la suppression des signalements (uniquement pour les utilisateurs authentifiés)
CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les signalements"
    ON signalements FOR DELETE
    USING (auth.role() = 'authenticated');

-- Note importante:
-- Ces politiques nécessitent que l'utilisateur soit authentifié (auth.role() = 'authenticated').
-- La lecture et l'insertion restent publiques pour permettre aux citoyens de créer et consulter leurs signalements.
-- Pour restreindre davantage, vous pouvez ajouter des vérifications de rôle spécifiques,
-- par exemple vérifier que l'utilisateur appartient à une commune spécifique.
