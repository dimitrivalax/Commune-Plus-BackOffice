-- Ajout de la colonne email à la table push_tokens
-- L'email peut être renseigné plus tard (création signalement, réservation, paramètres)

ALTER TABLE push_tokens
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_push_tokens_email ON push_tokens(email) WHERE email IS NOT NULL;
