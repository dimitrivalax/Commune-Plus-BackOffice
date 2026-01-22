-- Script SQL pour créer la table push_tokens pour les notifications push
-- Ce script doit être exécuté dans l'éditeur SQL de Supabase

-- Table pour stocker les tokens de push notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  device_id TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  user_id TEXT NOT NULL, -- UUID local généré côté client (pas de référence à auth.users pour permettre l'usage sans authentification)
  commune_id UUID REFERENCES commune(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_commune_id ON push_tokens(commune_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Activer la sécurité au niveau des lignes
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour push_tokens
-- Note: Comme l'app mobile n'utilise pas Supabase Auth, nous permettons l'accès public
-- avec des restrictions basées sur le user_id local stocké côté client

-- Permettre la lecture publique des tokens actifs (nécessaire pour envoyer les notifications)
CREATE POLICY "Lecture publique des tokens actifs"
    ON push_tokens FOR SELECT
    USING (is_active = true);

-- Permettre l'insertion publique (l'app mobile créera les tokens)
CREATE POLICY "Insertion publique des tokens"
    ON push_tokens FOR INSERT
    WITH CHECK (true);

-- Permettre la mise à jour publique (pour mettre à jour les tokens existants)
CREATE POLICY "Mise à jour publique des tokens"
    ON push_tokens FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Permettre la suppression publique (pour nettoyer les tokens)
CREATE POLICY "Suppression publique des tokens"
    ON push_tokens FOR DELETE
    USING (true);

-- Les administrateurs peuvent tout voir (pour envoyer les notifications)
-- Note: Cette politique nécessite que vous ayez une table utilisateur avec un champ role
-- Si vous avez une table utilisateur avec role='administrateur', vous pouvez utiliser cette politique :
-- CREATE POLICY "Les administrateurs peuvent tout voir"
--     ON push_tokens FOR SELECT
--     USING (
--       EXISTS (
--         SELECT 1 FROM utilisateur
--         WHERE utilisateur.user_id = auth.uid()
--         AND utilisateur.role = 'administrateur'
--       )
--     );

-- Pour l'instant, nous permettrons la lecture publique des tokens actifs pour les communes
-- (cela sera utilisé par le backend pour envoyer les notifications)
-- ATTENTION: En production, vous devriez utiliser un service backend avec authentification
-- plutôt que d'exposer directement les tokens via RLS
DROP POLICY IF EXISTS "Lecture publique des tokens pour notifications" ON push_tokens;
CREATE POLICY "Lecture publique des tokens pour notifications"
    ON push_tokens FOR SELECT
    USING (is_active = true);
