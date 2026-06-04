import {
  assertCanManageCommune,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
  requireAuth
} from '../../utils/firebase-auth'
import {
  getCommuneFacebookConfig,
  revokeCommuneFacebookConfig
} from '../../utils/facebook-pages-db'

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
  const communeId = getEffectiveCommuneIdForRequest(profile, requestedCommuneId)

  assertCanManageCommune(profile, communeId)

  const config = await getCommuneFacebookConfig(communeId!)
  if (!config) {
    return { success: true, disconnected: false }
  }

  await revokeCommuneFacebookConfig(communeId!)

  return {
    success: true,
    disconnected: true,
    page_name: config.page_name
  }
})
