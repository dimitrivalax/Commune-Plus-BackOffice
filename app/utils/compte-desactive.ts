/** E-mail support (compte désactivé, écran de connexion). */
export const CONTACT_SUPPORT_EMAIL = 'contact@commune-plus.fr'

/** Message texte (toast, API 403) — le lien cliquable est dans login.vue. */
export const COMPTE_DESACTIVE_MESSAGE
  = `Votre compte est désactivé. Contactez ${CONTACT_SUPPORT_EMAIL} en indiquant votre nom, prénom, e-mail et commune, s'il vous plaît.`

export const MAILTO_SUPPORT_HREF
  = `mailto:${CONTACT_SUPPORT_EMAIL}?subject=${encodeURIComponent('Réactivation compte Commune Plus')}`
