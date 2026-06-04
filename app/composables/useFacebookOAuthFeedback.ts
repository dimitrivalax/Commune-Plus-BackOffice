const FACEBOOK_OAUTH_PENDING_KEY = 'facebook-oauth-pending'

function facebookErrorMessage(reason: string): string {
  if (reason === 'aucune-page-trouvee') {
    return 'Aucune page Facebook gérée trouvée. Vérifiez que votre compte est administrateur d\'une page Facebook (pas seulement un profil personnel).'
  }
  return reason
}

export const useFacebookOAuthFeedback = () => {
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  function markFacebookOAuthPending() {
    if (!import.meta.client) return
    sessionStorage.setItem(FACEBOOK_OAUTH_PENDING_KEY, '1')
  }

  function clearFacebookOAuthPending() {
    if (!import.meta.client) return
    sessionStorage.removeItem(FACEBOOK_OAUTH_PENDING_KEY)
  }

  function isFacebookOAuthPending(): boolean {
    if (!import.meta.client) return false
    return sessionStorage.getItem(FACEBOOK_OAUTH_PENDING_KEY) === '1'
  }

  function consumeFacebookRouteQuery(onAfterOAuth?: () => void): boolean {
    const status = typeof route.query.facebook === 'string'
      ? route.query.facebook
      : undefined
    if (!status) return false

    if (status === 'connected') {
      const pageName = typeof route.query.page === 'string' ? route.query.page : ''
      toast.add({
        title: 'Facebook connecté',
        description: pageName
          ? `La page « ${pageName} » est reliée à la commune.`
          : 'La page Facebook est reliée à la commune.',
        color: 'success'
      })
      clearFacebookOAuthPending()
      onAfterOAuth?.()
    } else if (status === 'error') {
      const reason = typeof route.query.reason === 'string' ? route.query.reason : ''
      toast.add({
        title: 'Connexion Facebook échouée',
        description: facebookErrorMessage(reason || 'La connexion Facebook a échoué.'),
        color: 'error'
      })
      clearFacebookOAuthPending()
    }

    const nextQuery = { ...route.query }
    delete nextQuery.facebook
    delete nextQuery.page
    delete nextQuery.reason
    void router.replace({ query: nextQuery })
    return status === 'connected'
  }

  function setupFacebookOAuthWindowRefresh(onRefresh: () => void) {
    if (!import.meta.client) return

    const handleFocus = () => {
      if (!isFacebookOAuthPending()) return
      clearFacebookOAuthPending()
      onRefresh()
    }

    window.addEventListener('focus', handleFocus)
    onScopeDispose(() => {
      window.removeEventListener('focus', handleFocus)
    })
  }

  return {
    markFacebookOAuthPending,
    clearFacebookOAuthPending,
    consumeFacebookRouteQuery,
    setupFacebookOAuthWindowRefresh,
    facebookErrorMessage
  }
}
