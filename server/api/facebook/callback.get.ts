import {
  exchangeCodeForUserAccessToken,
  fetchFacebookUserId,
  fetchManagedFacebookPages,
  verifyFacebookOAuthState
} from '../../utils/facebook-oauth'
import { upsertCommuneFacebookConfig } from '../../utils/facebook-pages-db'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const errorReason = typeof query.error_description === 'string'
    ? query.error_description
    : (typeof query.error === 'string' ? query.error : '')

  if (errorReason) {
    return sendRedirect(
      event,
      `/actualites?facebook=error&reason=${encodeURIComponent(errorReason)}`,
      302
    )
  }

  if (!code || !state) {
    throw createError({
      statusCode: 400,
      message: 'Paramètres OAuth Facebook manquants'
    })
  }

  const statePayload = verifyFacebookOAuthState(state)
  const tokenData = await exchangeCodeForUserAccessToken(code)
  const facebookUserId = await fetchFacebookUserId(tokenData.access_token)
  const pages = await fetchManagedFacebookPages(tokenData.access_token)

  if (pages.length === 0) {
    return sendRedirect(
      event,
      '/actualites?facebook=error&reason=aucune-page-trouvee',
      302
    )
  }

  const selectedPage = pages[0]!
  await upsertCommuneFacebookConfig({
    communeId: statePayload.communeId,
    pageId: selectedPage.id,
    pageName: selectedPage.name,
    pageAccessToken: selectedPage.access_token,
    connectedByUtilisateurId: statePayload.utilisateurId,
    connectedFacebookUserAsid: facebookUserId
  })

  return sendRedirect(
    event,
    `/actualites?facebook=connected&page=${encodeURIComponent(selectedPage.name)}`,
    302
  )
})
