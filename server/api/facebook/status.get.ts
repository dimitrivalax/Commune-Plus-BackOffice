import {
  assertCanManageCommune,
  getCurrentUserProfile,
  getEffectiveCommuneIdForRequest,
  requireAuth
} from '../../utils/firebase-auth'
import {
  getCommuneFacebookConfig,
  getCommuneFacebookConfigMeta
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
    return { connected: false, has_configuration: false }
  }

  const activeConfig = await getCommuneFacebookConfig(communeId!)

  return {
    connected: Boolean(activeConfig),
    has_configuration: true,
    page_id: meta.page_id,
    page_name: meta.page_name,
    token_status: meta.token_status,
    updated_at: meta.updated_at
  }
})
