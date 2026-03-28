-- Fonctionnalités optionnelles de l'app mobile par commune (défaut : activées)
ALTER TABLE commune ADD COLUMN IF NOT EXISTS feature_reservations_salles BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE commune ADD COLUMN IF NOT EXISTS feature_propositions BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN commune.feature_reservations_salles IS 'Si false, masquer réservation de salles dans l''app citoyenne';
COMMENT ON COLUMN commune.feature_propositions IS 'Si false, masquer le module Propositions dans l''app citoyenne';
