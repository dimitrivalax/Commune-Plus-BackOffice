-- Identifier les votes des propositions par email au lieu de user_id.
-- Les anciens votes sont conservés avec un email de migration pour garder l'unicité.

ALTER TABLE proposition_votes
ADD COLUMN IF NOT EXISTS email TEXT;

-- Remplir les anciennes lignes avec une valeur unique (legacy-<id>)
UPDATE proposition_votes
SET email = 'legacy-' || id::text
WHERE email IS NULL;

ALTER TABLE proposition_votes
ALTER COLUMN email SET NOT NULL;

-- Remplacer la contrainte unique (proposition_id, user_id) par (proposition_id, email)
ALTER TABLE proposition_votes
DROP CONSTRAINT IF EXISTS proposition_votes_proposition_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposition_votes_proposition_email
ON proposition_votes(proposition_id, email);

-- user_id devient optionnel pour les nouveaux votes (identifiés par email)
ALTER TABLE proposition_votes
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN proposition_votes.email IS 'Email de l''utilisateur qui vote (identifiant du vote)';
