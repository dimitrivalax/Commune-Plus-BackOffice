# Notifications BackOffice

## Etat actuel

Les notifications affichees dans le BackOffice sont gerees cote application :

- lecture depuis Firestore via l'API BackOffice
- cache local via `localStorage` pour conserver le dernier etat charge
- affichage dans le panneau de notifications
- suppression immediate au clic
- suppression globale via un bouton `Supprimer toutes`

## Points cles

- Les nouvelles notifications metier restent alimentees par la collection Firestore `backoffice_notification`.
- La suppression cote BackOffice efface aussi les documents Firestore pour eviter leur rechargement.
- Le flux sert surtout la UX du BackOffice en session, avec un cache local de secours dans le navigateur courant.
- Les notifications push citoyennes sont un flux distinct (FCM).

## Consequence

Les nouvelles notifications creees depuis les flux metier (ex. signalements et reservations) remontent a nouveau dans la cloche du BackOffice.

Le cache `localStorage` n'est pas la source de verite : Firestore reste la source de lecture et de suppression pour cette cloche.
