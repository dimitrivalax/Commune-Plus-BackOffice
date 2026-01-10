-- Script SQL pour ajouter les politiques RLS permettant l'insertion, la mise à jour et la suppression
-- des informations municipales pour le backoffice (nécessite authentification)

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Tout le monde peut créer des informations municipales" ON municipal_info;
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les informations municipales" ON municipal_info;
DROP POLICY IF EXISTS "Tout le monde peut supprimer les informations municipales" ON municipal_info;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des informations municipales" ON municipal_info;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour les informations municipales" ON municipal_info;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer les informations municipales" ON municipal_info;

-- Politique pour permettre l'insertion des informations municipales (uniquement pour les utilisateurs authentifiés)
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des informations municipales"
    ON municipal_info FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Politique pour permettre la mise à jour des informations municipales (uniquement pour les utilisateurs authentifiés)
CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour les informations municipales"
    ON municipal_info FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Politique pour permettre la suppression des informations municipales (uniquement pour les utilisateurs authentifiés)
CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les informations municipales"
    ON municipal_info FOR DELETE
    USING (auth.role() = 'authenticated');

-- Note importante:
-- Ces politiques nécessitent que l'utilisateur soit authentifié (auth.role() = 'authenticated').
-- La lecture reste publique pour permettre l'affichage des informations aux citoyens.
-- Pour restreindre davantage, vous pouvez ajouter des vérifications de rôle spécifiques,
-- par exemple: auth.jwt() ->> 'user_role' = 'admin'
