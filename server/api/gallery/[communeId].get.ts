import { requireAuth, requireCurrentUserProfile } from '../../utils/firebase-auth'
import { listGalleryImages } from '../../utils/cloudinary'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const communeId = getRouterParam(event, 'communeId')
  if (!communeId) {
    throw createError({ statusCode: 400, message: 'communeId manquant' })
  }

  // Galerie globale "commune-plus" réservée aux administrateurs
  const isGlobalGallery = communeId === 'commune-plus'
  const canAccess
    = isGlobalGallery
      ? profile.role === 'administrateur'
      : profile.role === 'administrateur' || profile.communeIds.includes(communeId)
  if (!canAccess) {
    throw createError({ statusCode: 403, message: 'Accès à cette commune non autorisé' })
  }

  try {
    const resources = await listGalleryImages(communeId)
    return { images: resources }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement de la galerie'
    throw createError({ statusCode: 500, message })
  }
})
