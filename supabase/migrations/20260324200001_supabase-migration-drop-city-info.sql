-- Script SQL pour supprimer la table city_info qui n'est plus utilisée
-- L'application utilise la table commune à la place

DROP TABLE IF EXISTS city_info CASCADE;
