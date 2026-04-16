# Architecture Decision Records (ADR)

Ce dossier contient les Architecture Decision Records (ADR) et la documentation technique du projet.

## Fichiers

- `0001-data-access-layering.md` : decision d'architecture pour separer UI et acces aux donnees (`Service/List/PageState`).
- `0002-backoffice-notifications.md` : architecture des notifications BackOffice (UI + persistance locale).
- `0003-signalement-notifications.md` : flux des notifications push de signalements (mobile <-> BackOffice <-> FCM).
- `0004-mobile-analytics-rgpd.md` : cadrage RGPD et instrumentation analytics mobile.

## Convention de nommage

- Format fichier : `NNNN-slug-kebab-case.md`
- `NNNN` : numero sequentiel sur 4 chiffres (ex: `0005`)
- `slug-kebab-case` : sujet court et explicite (ex: `auth-role-model`)
- Lorsqu'un nouvel ADR est cree, utiliser le numero suivant disponible.

## Template

- Utiliser `TEMPLATE-ADR.md` comme base pour les nouveaux ADR.

## Qu'est-ce qu'un ADR ?

Un Architecture Decision Record (ADR) est un document qui capture une décision architecturale importante, le contexte qui l'a motivée, et les conséquences de cette décision.

Ces documents aident à :
- Comprendre pourquoi certaines décisions ont été prises
- Partager la connaissance avec l'équipe
- Éviter de répéter les mêmes discussions
- Faciliter l'onboarding de nouveaux développeurs
