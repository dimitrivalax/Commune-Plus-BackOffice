import type { Commune } from '~/types'
import { requireAuth } from '../../utils/supabase-auth'
import { requireCurrentUserProfile } from '../../utils/supabase-auth'

export interface CurrentUserMe {
  id: string
  role: 'utilisateur' | 'administrateur'
  communes: Commune[]
}

export default eventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const communes: Commune[] = []

  if (profile.communeIds.length > 0) {
    const { data: communesData, error: communesError } = await supabase
      .from('commune')
      .select('id, name, postal_code, email, created_at, updated_at')
      .in('id', profile.communeIds)
      .order('name', { ascending: true })

    if (!communesError && communesData) {
      communes.push(...communesData)
    }
  }

  const result: CurrentUserMe = {
    id: profile.utilisateurId,
    role: profile.role,
    communes
  }

  return result
})
