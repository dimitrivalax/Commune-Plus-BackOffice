import { requireAuth } from '../../utils/supabase-auth'
import { requireCurrentUserProfile } from '../../utils/supabase-auth'
import { uploadGalleryImage } from '../../utils/cloudinary'

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier envoyé' })
  }

  let communeId: string | null = null
  let fileBuffer: Buffer | null = null
  let mimeType = 'image/jpeg'

  for (const field of form) {
    if (field.name === 'commune_id' && field.data) {
      communeId = field.data.toString('utf-8')
    } else if (field.name === 'file' && field.data) {
      fileBuffer = field.data
      if (field.type) mimeType = field.type
    }
  }

  if (!communeId) {
    throw createError({ statusCode: 400, message: 'commune_id manquant' })
  }
  if (!fileBuffer) {
    throw createError({ statusCode: 400, message: 'Fichier manquant' })
  }

  const canAccess = profile.role === 'administrateur' || profile.communeIds.includes(communeId)
  if (!canAccess) {
    throw createError({ statusCode: 403, message: 'Accès à cette commune non autorisé' })
  }

  try {
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`
    const result = await uploadGalleryImage(communeId, dataUrl)
    return result
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'upload'
    throw createError({ statusCode: 500, message })
  }
})
