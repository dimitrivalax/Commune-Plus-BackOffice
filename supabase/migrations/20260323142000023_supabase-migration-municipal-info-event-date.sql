-- Ajouter la colonne event_date à municipal_info (date de l'événement, par défaut aujourd'hui)
ALTER TABLE municipal_info
ADD COLUMN IF NOT EXISTS event_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN municipal_info.event_date IS 'Date de l''événement concerné par l''information';
