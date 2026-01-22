-- Script de migration pour renommer la table incivilities en signalements
-- À exécuter si vous avez déjà créé la table incivilities

-- Étape 1: Supprimer les anciennes politiques RLS (avant le renommage)
DROP POLICY IF EXISTS "Tout le monde peut créer des incivilités" ON incivilities;
DROP POLICY IF EXISTS "Tout le monde peut lire ses propres incivilités" ON incivilities;

-- Étape 2: Renommer la table
ALTER TABLE IF EXISTS incivilities RENAME TO signalements;

-- Étape 3: Renommer les index
ALTER INDEX IF EXISTS idx_incivilities_created_at RENAME TO idx_signalements_created_at;
ALTER INDEX IF EXISTS idx_incivilities_lat_lng RENAME TO idx_signalements_lat_lng;

-- Étape 4: Renommer le trigger
DROP TRIGGER IF EXISTS update_incivilities_updated_at ON signalements;
CREATE TRIGGER update_signalements_updated_at BEFORE UPDATE ON signalements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Étape 5: Créer les nouvelles politiques RLS avec les nouveaux noms
CREATE POLICY "Tout le monde peut créer des signalements"
    ON signalements FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Tout le monde peut lire ses propres signalements"
    ON signalements FOR SELECT
    USING (true);

