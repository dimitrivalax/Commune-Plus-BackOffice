import {
  assertCanManageCommune,
  getCurrentUserProfile,
  requireAuth
} from '../../utils/firebase-auth'
import {
  createFacebookOAuthState,
  getFacebookOAuthUrl
} from '../../utils/facebook-oauth'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await getCurrentUserProfile(event)
  if (!profile) {
    throw createError({
      statusCode: 404,
      message: 'Profil utilisateur non trouvé'
    })
  }

  const query = getQuery(event)
  const requestedCommuneId = typeof query.commune_id === 'string'
    ? query.commune_id
    : undefined
  const communeId = profile.role === 'administrateur'
    ? requestedCommuneId
    : profile.communeIds[0]

  assertCanManageCommune(profile, communeId)
  const state = createFacebookOAuthState(communeId!, profile.utilisateurId)
  return {
    url: getFacebookOAuthUrl(state)
  }
})
