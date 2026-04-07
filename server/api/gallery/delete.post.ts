import { requireAuth, requireCurrentUserProfile } from '../../utils/firebase-auth'
import { deleteGalleryImage } from '../../utils/cloudinary'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const body = await readBody(event).catch(() => ({}))
  const publicId = body?.public_id as string | undefined
  if (!publicId || typeof publicId !== 'string') {
    throw createError({ statusCode: 400, message: 'public_id manquant' })
  }

  if (!publicId.startsWith('galleries/')) {
    throw createError({ statusCode: 400, message: 'public_id invalide' })
  }

  const communeId = publicId.split('/')[1]
  if (!communeId) {
    throw createError({ statusCode: 400, message: 'public_id invalide' })
  }

  // Galerie globale "commune-plus" : seul l'admin peut supprimer
  const isGlobalGallery = communeId === 'commune-plus'
  const canAccess =
    isGlobalGallery
      ? profile.role === 'administrateur'
      : profile.role === 'administrateur' || profile.communeIds.includes(communeId)
  if (!canAccess) {
    throw createError({ statusCode: 403, message: 'Accès à cette commune non autorisé' })
  }

  try {
    await deleteGalleryImage(publicId)
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
    throw createError({ statusCode: 500, message })
  }
})
