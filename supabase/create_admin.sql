-- Script de création de l'administrateur Commune Plus
-- Email : contact@commune-plus.fr
-- Password : #1234567890Az

DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    user_email TEXT := 'contact@commune-plus.fr';
    -- Mot de passe spécifié
    user_password TEXT := '#1234567890Az'; 
BEGIN
    -- 1. Création dans auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, recovery_sent_at, last_sign_in_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, confirmation_token, email_change,
            email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_user_id,
            'authenticated',
            'authenticated',
            user_email,
            extensions.crypt(user_password, extensions.gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}',
            '{"first_name":"Commune","last_name":"Plus"}',
            now(), now(), '', '', '', ''
        );

        -- 2. Mise à jour du profil (le trigger on_auth_user_created aura créé la ligne)
        UPDATE public.utilisateur
        SET 
            role = 'administrateur',
            is_active = true,
            nom = 'Plus',
            prenom = 'Commune'
        WHERE email = user_email;
        
        RAISE NOTICE 'Utilisateur % créé avec succès.', user_email;
    ELSE
        -- Si l'utilisateur existe déjà, on force le rôle admin et l'activation
        UPDATE public.utilisateur
        SET 
            role = 'administrateur',
            is_active = true
        WHERE email = user_email;
        
        RAISE NOTICE 'L''utilisateur % existait déjà. Son profil a été mis à jour.', user_email;
    END IF;
END $$;
