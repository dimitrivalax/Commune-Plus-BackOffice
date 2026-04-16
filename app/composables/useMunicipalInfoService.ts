import type { MunicipalInfo } from '~/types'

interface CreateMunicipalInfoInput {
  title: string
  content: string
  event_date: string | null
  category: string | null
  image_url: string | null
  scheduled_publish_at: string | null
  commune_id?: string | null
}

interface UpdateMunicipalInfoInput {
  id: string
  title: string
  content: string
  event_date: string | null
  category: string | null
  image_url: string | null
  scheduled_publish_at: string | null
}

interface DuplicateMunicipalInfoInput {
  source: MunicipalInfo
  title?: string
  content?: string
  event_date?: string | null
  category?: string | null
  image_url?: string | null
}

export const useMunicipalInfoService = () => {
  const { getAuthHeaders } = useApiAuth()
  const { currentCommune } = useCurrentCommune()

  async function createMunicipalInfo(input: CreateMunicipalInfoInput) {
    const communeId = input.commune_id ?? currentCommune.value?.id
    if (!communeId) {
      throw new Error('Veuillez sélectionner une commune avant de créer une actualité.')
    }

    return await $fetch('/api/municipal-info/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        ...input,
        commune_id: communeId
      }
    })
  }

  async function updateMunicipalInfo(input: UpdateMunicipalInfoInput) {
    const { id, ...body } = input
    return await $fetch(`/api/municipal-info/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body
    })
  }

  async function deleteMunicipalInfo(id: string) {
    return await $fetch(`/api/municipal-info/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
  }

  async function duplicateMunicipalInfo(input: DuplicateMunicipalInfoInput) {
    const { source } = input
    const communeId = source.commune_id ?? currentCommune.value?.id
    if (!communeId) {
      throw new Error('Impossible de déterminer la commune pour la duplication.')
    }

    const title = (input.title ?? source.title).trim()

    return await $fetch('/api/municipal-info/create', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        title: title.endsWith(' (copie)') ? title : `${title} (copie)`,
        content: input.content ?? source.content,
        event_date: input.event_date ?? source.event_date,
        category: input.category ?? source.category,
        image_url: input.image_url ?? source.image_url,
        scheduled_publish_at: null,
        commune_id: communeId
      }
    })
  }

  return {
    createMunicipalInfo,
    updateMunicipalInfo,
    deleteMunicipalInfo,
    duplicateMunicipalInfo
  }
}
