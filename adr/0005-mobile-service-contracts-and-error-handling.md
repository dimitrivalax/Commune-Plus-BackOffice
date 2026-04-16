# ADR: Standardiser les contrats de services et la gestion d'erreurs mobile

## Statut

Accepte

## Date

2026-04-16

## Contexte

Les ecrans mobile utilisaient des patterns heterogenes pour recuperer les messages d'erreur (`error.message`, fallback inline, objets non normalises), et les services retournaient des structures parfois inconsistantes (ex: certains retours sans cle `data`).

Cette heterogeneite augmentait le risque de regressions UI, complexifiait le debug et rendait le code plus difficile a maintenir.

## Decision

Nous standardisons la couche mobile autour de deux conventions:

1. **Convention d'erreur UI**  
   Les vues utilisent `getErrorMessage(error, fallback)` pour construire les messages utilisateurs et les payloads de tracking.

2. **Convention de contrat service**  
   Les services applicatifs exposent un contrat stable base sur `{ data, error }`, avec normalisation des erreurs captees via `normalizeServiceError(error, fallback)`.

En complement, la resolution de commune est factorisee via `useCommuneId` pour eviter la duplication.

## Portee

- `Commune-Plus-Mobile/src/views/*` pour les ecrans consommatteurs.
- `Commune-Plus-Mobile/src/services/*` pour les services metier.
- `Commune-Plus-Mobile/src/utils/error-message.js`.
- `Commune-Plus-Mobile/src/utils/service-error.js`.
- `Commune-Plus-Mobile/src/composables/useCommuneId.js`.

## Alternatives considerees

1. Garder les patterns existants et corriger au fil de l'eau
   - + Aucun cout de migration immediate
   - - Dette technique persistante, conventions implicites, rework recurrent
2. Introduire une librairie d'erreur globale avec typage strict TS
   - + Cadre tres robuste a long terme
   - - Surdimensionne pour le scope actuel, cout de migration important

## Consequences

Positives:

- Messages d'erreur plus coherents dans les toasts, logs et analytics.
- Contrats de services plus predictibles pour les vues.
- Moins de duplication de logique transversale (commune ID).

Compromis:

- Legere augmentation du nombre d'utilitaires (`error-message`, `service-error`).
- Besoin de vigilance pour conserver la convention dans les futurs ecrans/services.

## Non-objectifs

- Conversion complete du mobile en TypeScript.
- Refonte fonctionnelle des workflows produit.
- Normalisation exhaustive de tous les modules hors mobile.

## Plan de migration (optionnel)

- [x] Ajouter les utilitaires `getErrorMessage` et `normalizeServiceError`.
- [x] Aligner les services mobile principaux sur le contrat `{ data, error }`.
- [x] Aligner les vues critiques sur `getErrorMessage`.
- [ ] Ajouter une regle de revue explicite dans la checklist PR mobile.
