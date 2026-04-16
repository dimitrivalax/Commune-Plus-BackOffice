# ADR: Standardisation de l'acces aux donnees (BackOffice)

## Statut

Accepte

## Date

2026-04-16

## Contexte

Le code BackOffice melangeait, selon les ecrans, logique UI et appels reseau (`useFetch`, `useAsyncData`, `$fetch`) directement dans des pages ou composants.
Ce couplage rendait les evolutions transverses plus couteuses (payloads, headers, gestion d'erreurs, conventions de typage).

Une normalisation est necessaire pour:

- rendre la structure previsible
- centraliser les acces API
- reduire la duplication de logique
- faciliter les revues et refactors

## Decision

Adopter une architecture en 3 couches de composables:

- `useXxxService`: methodes API (CRUD/actions), payloads et retours types
- `useXxxList`: lecture/liste (`data`, `status`, `refresh`, wiring query/headers/watch)
- `useXxxPageState`: etat de presentation (filtres, tri, pagination, derives UI)

Regles associees:

- pas d'appels reseau directs dans `app/pages/**/*.vue` ni `app/components/**/*.vue`
- pas de `any` dans le code applicatif
- `catch (error: unknown)` + `getErrorMessage(error, fallback)` pour les erreurs utilisateur

## Portee

- `app/pages/**/*.vue`
- `app/components/**/*.vue`
- `app/composables/**/*.ts`

## Alternatives considerees

1. Laisser les appels reseau dans chaque page/composant
   - + rapide a court terme
   - - dette technique et duplication accrue

2. Introduire un store global unique pour toutes les donnees
   - + centralisation forte
   - - complexite et couplage global plus eleves pour ce besoin

## Consequences

Positives:

- separation claire UI/data
- code plus testable
- maintenance simplifiee des endpoints/payloads
- conventions reproductibles pour les nouveaux modules

Compromis:

- davantage de fichiers/composables a maintenir
- discipline d'equipe necessaire pour garder la convention

## Non-objectifs

- ne pas modifier le comportement fonctionnel des ecrans
- ne pas imposer un framework externe de data fetching
