import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your environment variables.')
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

const signupSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  fonction: z.string().min(1, 'La fonction est requise'),
  email: z.string().email('L\'email n\'est pas valide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères')
})

export default eventHandler(async (event) => {
  if (!supabase) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration is missing'
    })
  }

  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed'
    })
  }

  try {
    const body = await readBody(event)
    const validatedData = signupSchema.parse(body)

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          first_name: validatedData.firstName,
          last_name: validatedData.lastName,
          fonction: validatedData.fonction
        }
      }
    })

    if (authError) {
      throw createError({
        statusCode: 400,
        message: authError.message || 'Erreur lors de la création du compte'
      })
    }

    if (!authData.user) {
      throw createError({
        statusCode: 500,
        message: 'Erreur lors de la création de l\'utilisateur'
      })
    }

    return {
      success: true,
      user: authData.user
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        message: `Erreur de validation: ${error.issues.map(issue => issue.message).join(', ')}`
      })
    }

    const errorObj = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: errorObj.statusCode || 500,
      message: errorObj.message || 'Une erreur est survenue lors de la création du compte'
    })
  }
})
