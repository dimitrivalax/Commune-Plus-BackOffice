-- Compte utilisateur actif / désactivé (back-office + blocage API)
-- À exécuter dans l'éditeur SQL Supabase (après supabase-migration-utilisateurs.sql).

ALTER TABLE public.utilisateur
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.utilisateur.is_active IS 'Si false, l''utilisateur ne peut pas se connecter ni utiliser l''API back-office.';

-- Un administrateur désactivé ne doit plus passer is_current_user_admin() (RLS).
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateur
    WHERE user_id = auth.uid()
    AND role = 'administrateur'
    AND is_active IS TRUE
  );
$$;

-- RPC liste utilisateurs : inclure is_active
DROP FUNCTION IF EXISTS get_utilisateurs_with_last_sign_in();
CREATE FUNCTION get_utilisateurs_with_last_sign_in()
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
  role TEXT,
  is_active BOOLEAN,
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
    u.role,
    u.is_active,
    u.created_at,
    u.updated_at,
    au.last_sign_in_at
  FROM public.utilisateur u
  LEFT JOIN auth.users au ON u.user_id = au.id
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_utilisateurs_with_last_sign_in() TO authenticated;

COMMENT ON FUNCTION get_utilisateurs_with_last_sign_in() IS 'Utilisateurs avec dernière connexion (auth.users) et statut is_active';

-- Seuls les administrateurs actifs peuvent modifier is_active (évite réactivation via le client Supabase).
CREATE OR REPLACE FUNCTION utilisateur_preserve_is_active_for_non_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS utilisateur_is_active_admin_only ON public.utilisateur;
CREATE TRIGGER utilisateur_is_active_admin_only
  BEFORE UPDATE ON public.utilisateur
  FOR EACH ROW
  EXECUTE FUNCTION utilisateur_preserve_is_active_for_non_admin();
