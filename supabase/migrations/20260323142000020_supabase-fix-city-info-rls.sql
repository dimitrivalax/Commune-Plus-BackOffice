-- Script SQL pour corriger les politiques RLS de la table city_info
-- À exécuter si la sauvegarde en base de données ne fonctionne pas

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Tout le monde peut créer/mettre à jour les informations de la commune" ON city_info;
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les informations de la commune" ON city_info;
DROP POLICY IF EXISTS "Tout le monde peut lire les informations de la commune" ON city_info;

-- Recréer les politiques correctement
CREATE POLICY "Tout le monde peut lire les informations de la commune"
    ON city_info FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Tout le monde peut créer les informations de la commune" ON city_info;
CREATE POLICY "Tout le monde peut créer les informations de la commune"
    ON city_info FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Tout le monde peut mettre à jour les informations de la commune"
    ON city_info FOR UPDATE
    USING (true)
    WITH CHECK (true);



