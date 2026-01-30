import { createClient } from '@supabase/supabase-js'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createSharedComposable } from '@vueuse/core'

let supabase: SupabaseClient | null = null

const getSupabaseClient = (): SupabaseClient | null => {
  if (supabase) {
    return supabase
  }

  try {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl || ''
    const supabaseAnonKey = config.public.supabaseAnonKey || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        'Supabase credentials are missing. Please check your environment variables.'
      )
      return null
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey)
    return supabase
  } catch (error) {
    console.error('Error initializing Supabase client:', error)
    return null
  }
}

const _useSupabase = () => {
  const user = useState<User | null>('supabase_user', () => null)
  const session = useState<any>('supabase_session', () => null)

  const client = getSupabaseClient()

  const signUp = async (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => {
    if (!client) {
      throw new Error('Supabase is not configured')
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) {
      throw error
    }

    return data
  }

  const signIn = async (email: string, password: string) => {
    if (!client) {
      throw new Error('Supabase is not configured')
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }

    user.value = data.user
    session.value = data.session

    return data
  }

  const signOut = async () => {
    if (!client) {
      throw new Error('Supabase is not configured')
    }

    const { error } = await client.auth.signOut()

    if (error) {
      throw error
    }

    user.value = null
    session.value = null
  }

  const getCurrentUser = async () => {
    if (!client) {
      return null
    }

    const {
      data: { user: currentUser }
    } = await client.auth.getUser()
    user.value = currentUser
    return currentUser
  }

  const getSession = async () => {
    if (!client) {
      return null
    }

    const {
      data: { session: currentSession }
    } = await client.auth.getSession()
    session.value = currentSession
    if (currentSession) {
      user.value = currentSession.user
    }
    return currentSession
  }

  // Initialiser la session si on est côté client
  if (import.meta.client) {
    getSession().catch(() => {
      // Ignorer les erreurs silencieusement
    })

    // Écouter les changements d'authentification
    if (client) {
      client.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
      })
    }
  }

  return {
    supabase: client,
    user: readonly(user),
    session: readonly(session),
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getSession
  }
}

export const useSupabase = createSharedComposable(_useSupabase)
