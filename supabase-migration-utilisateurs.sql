-- Script SQL pour créer la table utilisateur et renommer city_info en commune
-- Ce script doit être exécuté dans l'éditeur SQL de Supabase

-- Étape 1: Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 2: Créer ou renommer la table city_info en commune
DO $$
BEGIN
  -- Vérifier si city_info existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'city_info'
  ) THEN
    -- Supprimer d'abord les anciennes politiques RLS
    EXECUTE 'DROP POLICY IF EXISTS "Tout le monde peut lire les informations de la commune" ON city_info';
    EXECUTE 'DROP POLICY IF EXISTS "Tout le monde peut créer les informations de la commune" ON city_info';
    EXECUTE 'DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les informations de la commune" ON city_info';

    -- Renommer la table
    EXECUTE 'ALTER TABLE city_info RENAME TO commune';

    -- Renommer les index s'ils existent
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_city_info_name') THEN
      EXECUTE 'ALTER INDEX idx_city_info_name RENAME TO idx_commune_name';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_city_info_postal_code') THEN
      EXECUTE 'ALTER INDEX idx_city_info_postal_code RENAME TO idx_commune_postal_code';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_city_info_updated_at') THEN
      EXECUTE 'ALTER INDEX idx_city_info_updated_at RENAME TO idx_commune_updated_at';
    END IF;

    -- Supprimer les anciens triggers (ils seront recréés après)
    EXECUTE 'DROP TRIGGER IF EXISTS update_city_info_updated_at ON commune';
    EXECUTE 'DROP TRIGGER IF EXISTS update_commune_updated_at ON commune';
  END IF;
END $$;

-- Si city_info n'existe pas, créer directement la table commune
CREATE TABLE IF NOT EXISTS commune (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index (ils seront créés seulement s'ils n'existent pas déjà)
CREATE INDEX IF NOT EXISTS idx_commune_name ON commune(name);
CREATE INDEX IF NOT EXISTS idx_commune_postal_code ON commune(postal_code);
CREATE INDEX IF NOT EXISTS idx_commune_updated_at ON commune(updated_at DESC);

-- Créer le trigger pour la table commune (une seule fois, après avoir créé/renommé la table)
DROP TRIGGER IF EXISTS update_commune_updated_at ON commune;
CREATE TRIGGER update_commune_updated_at BEFORE UPDATE ON commune
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- S'assurer que la table commune existe maintenant et configurer RLS
ALTER TABLE IF EXISTS commune ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Tout le monde peut lire les informations de la commune" ON commune;
DROP POLICY IF EXISTS "Tout le monde peut créer les informations de la commune" ON commune;
DROP POLICY IF EXISTS "Tout le monde peut mettre à jour les informations de la commune" ON commune;

-- Recréer les politiques RLS avec le nouveau nom
CREATE POLICY "Tout le monde peut lire les informations de la commune"
    ON commune FOR SELECT
    USING (true);

CREATE POLICY "Tout le monde peut créer les informations de la commune"
    ON commune FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Tout le monde peut mettre à jour les informations de la commune"
    ON commune FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Étape 3: Créer la table utilisateur
CREATE TABLE IF NOT EXISTS utilisateur (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  numero_de_rue TEXT,
  rue TEXT,
  code_postal TEXT,
  ville TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_utilisateur_user_id ON utilisateur(user_id);
CREATE INDEX IF NOT EXISTS idx_utilisateur_email ON utilisateur(email);
CREATE INDEX IF NOT EXISTS idx_utilisateur_code_postal ON utilisateur(code_postal);
CREATE INDEX IF NOT EXISTS idx_utilisateur_updated_at ON utilisateur(updated_at DESC);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_utilisateur_updated_at ON utilisateur;
CREATE TRIGGER update_utilisateur_updated_at BEFORE UPDATE ON utilisateur
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) pour la table utilisateur
ALTER TABLE utilisateur ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour utilisateur
-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir tous les utilisateurs" ON utilisateur;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre profil" ON utilisateur;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leur propre profil" ON utilisateur;

-- Permettre à tous les utilisateurs authentifiés de voir tous les utilisateurs
CREATE POLICY "Les utilisateurs authentifiés peuvent voir tous les utilisateurs"
    ON utilisateur FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Les utilisateurs peuvent créer leur propre profil"
    ON utilisateur FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil"
    ON utilisateur FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Étape 4: Créer la table de liaison utilisateur_commune (many-to-many)
CREATE TABLE IF NOT EXISTS utilisateur_commune (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES commune(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(utilisateur_id, commune_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_utilisateur_commune_utilisateur_id ON utilisateur_commune(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_utilisateur_commune_commune_id ON utilisateur_commune(commune_id);

-- RLS pour la table utilisateur_commune
ALTER TABLE utilisateur_commune ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs communes" ON utilisateur_commune;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leurs associations" ON utilisateur_commune;
DROP POLICY IF EXISTS "Les administrateurs peuvent tout voir" ON utilisateur_commune;
DROP POLICY IF EXISTS "Les administrateurs peuvent tout créer" ON utilisateur_commune;

CREATE POLICY "Les utilisateurs peuvent voir leurs communes"
    ON utilisateur_commune FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM utilisateur 
        WHERE utilisateur.id = utilisateur_commune.utilisateur_id 
        AND utilisateur.user_id = auth.uid()
      )
    );

CREATE POLICY "Les utilisateurs peuvent créer leurs associations"
    ON utilisateur_commune FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM utilisateur 
        WHERE utilisateur.id = utilisateur_commune.utilisateur_id 
        AND utilisateur.user_id = auth.uid()
      )
    );

CREATE POLICY "Les administrateurs peuvent tout voir"
    ON utilisateur_commune FOR SELECT
    USING (true);

CREATE POLICY "Les administrateurs peuvent tout créer"
    ON utilisateur_commune FOR INSERT
    WITH CHECK (true);

-- Étape 5: Créer une fonction pour créer automatiquement un utilisateur lors de la création d'un user Supabase
CREATE OR REPLACE FUNCTION create_utilisateur_on_user_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer un utilisateur dans la table utilisateur avec les données du user Supabase
  INSERT INTO public.utilisateur (
    user_id,
    nom,
    prenom,
    email
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger qui s'exécute après l'insertion d'un user dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_utilisateur_on_user_created();

-- Étape 6: Créer une fonction SECURITY DEFINER pour récupérer les utilisateurs avec leur dernière connexion
-- Cette fonction permet d'accéder à auth.users qui est normalement inaccessible
CREATE OR REPLACE FUNCTION get_utilisateurs_with_last_sign_in()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  nom TEXT,
  prenom TEXT,
  numero_de_rue TEXT,
  rue TEXT,
  code_postal TEXT,
  ville TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    u.id,
    u.user_id,
    u.nom,
    u.prenom,
    u.numero_de_rue,
    u.rue,
    u.code_postal,
    u.ville,
    u.email,
    u.created_at,
    u.updated_at,
    au.last_sign_in_at
  FROM public.utilisateur u
  LEFT JOIN auth.users au ON u.user_id = au.id
  ORDER BY u.created_at DESC;
$$;

-- Donner les permissions nécessaires sur la fonction
GRANT EXECUTE ON FUNCTION get_utilisateurs_with_last_sign_in() TO authenticated;

-- Commentaires sur les tables
COMMENT ON TABLE utilisateur IS 'Table des utilisateurs liés aux users Supabase';
COMMENT ON TABLE commune IS 'Table des communes (anciennement city_info)';
COMMENT ON TABLE utilisateur_commune IS 'Table de liaison many-to-many entre utilisateurs et communes';
COMMENT ON FUNCTION get_utilisateurs_with_last_sign_in() IS 'Fonction pour récupérer les utilisateurs avec leur dernière connexion depuis auth.users';
