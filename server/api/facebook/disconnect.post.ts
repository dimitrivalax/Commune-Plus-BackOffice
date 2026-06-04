import {
  assertCanManageCommune,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
  requireAuth
} from '../../utils/firebase-auth'
import {
  getCommuneFacebookConfigMeta,
  removeCommuneFacebookConfig
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

  const meta = await getCommuneFacebookConfigMeta(communeId!)
  if (!meta?.page_id) {
    return { success: true, disconnected: false }
  }

  const pageName = meta.page_name
  await removeCommuneFacebookConfig(communeId!)

  return {
    success: true,
    disconnected: true,
    page_name: pageName
  }
})
