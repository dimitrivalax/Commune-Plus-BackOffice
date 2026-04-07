# Notifications BackOffice

## Etat actuel

Les notifications affichees dans le BackOffice sont gerees cote application :

- lecture/ecriture locale via `localStorage`
- affichage dans le panneau de notifications
- marquage lu/non lu en local

## Points cles

- Pas de dependance a une table SQL dediee pour ce flux.
- Le flux sert surtout la UX du BackOffice en session.
- Les notifications push citoyennes sont un flux distinct (FCM).

## Consequence

Si une persistance serveur multi-session est requise, il faudra introduire une collection Firestore dediee et une API associee.
