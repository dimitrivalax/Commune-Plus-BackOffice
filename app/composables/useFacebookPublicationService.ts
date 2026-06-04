interface PublishToFacebookResponse {
  success: boolean
  facebook_post_id: string
}

interface FacebookConnectResponse {
  url: string
}

interface FacebookStatusResponse {
  connected: boolean
  has_configuration?: boolean
  page_id?: string
  page_name?: string
  token_status?: 'active' | 'revoked' | 'expired'
  updated_at?: string
}

interface FacebookDisconnectResponse {
  success: boolean
  disconnected: boolean
  page_name?: string
}

export const useFacebookPublicationService = () => {
  const { getAuthHeaders } = useApiAuth()
  const { currentCommune } = useCurrentCommune()

  async function getConnectUrl(communeIdArg?: string) {
    const communeId = communeIdArg ?? currentCommune.value?.id
    if (!communeId) {
      throw new Error('Veuillez sélectionner une commune avant de connecter Facebook.')
    }
    const query = new URLSearchParams({ commune_id: communeId })
    const response = await $fetch<FacebookConnectResponse>(
      `/api/facebook/connect?${query.toString()}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    )
    return response.url
  }

  async function publishToFacebook(infoId: string) {
    return await $fetch<PublishToFacebookResponse>(
      `/api/municipal-info/${infoId}/publish-facebook`,
      {
        method: 'POST',
        headers: getAuthHeaders()
      }
    )
  }

  async function getFacebookStatus(communeIdArg?: string) {
    const communeId = communeIdArg ?? currentCommune.value?.id
    if (!communeId) {
      throw new Error('Veuillez sélectionner une commune.')
    }
    const query = new URLSearchParams({ commune_id: communeId })
    return await $fetch<FacebookStatusResponse>(
      `/api/facebook/status?${query.toString()}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    )
  }

  async function disconnectFacebook(communeIdArg?: string) {
    const communeId = communeIdArg ?? currentCommune.value?.id
    if (!communeId) {
      throw new Error('Veuillez sélectionner une commune.')
    }
    const query = new URLSearchParams({ commune_id: communeId })
    return await $fetch<FacebookDisconnectResponse>(
      `/api/facebook/disconnect?${query.toString()}`,
      {
        method: 'POST',
        headers: getAuthHeaders()
      }
    )
  }

  return {
    getConnectUrl,
    publishToFacebook,
    getFacebookStatus,
    disconnectFacebook
  }
}
