import {
  assertCanManageCommune,
  getCurrentUserProfile,
  requireAuth
} from '../../utils/firebase-auth'
import { getCommuneFacebookConfig } from '../../utils/facebook-pages-db'

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

  const config = await getCommuneFacebookConfig(communeId!)
  if (!config) {
    return { connected: false }
  }

  return {
    connected: true,
    page_id: config.page_id,
    page_name: config.page_name,
    token_status: config.token_status,
    updated_at: config.updated_at
  }
})
