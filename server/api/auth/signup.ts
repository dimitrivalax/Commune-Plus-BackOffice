import { z } from 'zod'
import { getAdminAuth } from '../../utils/firebase-admin-app'

const signupSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  fonction: z.string().min(1, 'La fonction est requise'),
  email: z.string().email('L\'email n\'est pas valide'),
  password: z
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
})

export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method not allowed' })
  }

  try {
    const body = await readBody(event)
    const validatedData = signupSchema.parse(body)

    const auth = getAdminAuth()
    const userRecord = await auth.createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: `${validatedData.firstName} ${validatedData.lastName}`
    })

    return {
      success: true,
      user: {
        id: userRecord.uid,
        email: userRecord.email
      }
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: `Erreur de validation: ${error.issues.map(i => i.message).join(', ')}`
      })
    }
    const e = error as { code?: string, message?: string, statusCode?: number }
    if (e.code === 'auth/email-already-exists' || e.message?.includes('email-already')) {
      throw createError({
        statusCode: 400,
        message: 'Cette adresse e-mail est déjà utilisée.'
      })
    }
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || 'Une erreur est survenue lors de la création du compte'
    })
  }
})
