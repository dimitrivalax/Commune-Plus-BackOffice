import { parseFacebookSignedRequest } from '../../utils/facebook-signed-request'
import {
  findCommuneFacebookConfigsByAsid,
  revokeCommuneFacebookConfig
} from '../../utils/facebook-pages-db'
import {
  createFacebookDataDeletionRequest,
  markFacebookDataDeletionRequestProcessed
} from '../../utils/facebook-data-deletion-db'

function getStatusUrl(confirmationCode: string): string {
  const base = process.env.APP_URL || 'https://backoffice.commune-plus.fr'
  return `${base.replace(/\/$/, '')}/api/facebook/data-deletion-status?id=${encodeURIComponent(confirmationCode)}`
}

export default eventHandler(async (event) => {
  assertMethod(event, 'POST')

  const body = await readBody<Record<string, unknown> | string | undefined>(event)
  let signedRequest: string | undefined
  if (typeof body === 'string') {
    const params = new URLSearchParams(body)
    signedRequest = params.get('signed_request') ?? undefined
  } else if (body && typeof body === 'object') {
    const raw = (body as Record<string, unknown>).signed_request
    if (typeof raw === 'string') signedRequest = raw
  }

  if (!signedRequest) {
    throw createError({ statusCode: 400, message: 'signed_request manquant' })
  }

  const payload = parseFacebookSignedRequest(signedRequest)
  const asid = payload.user_id

  const { confirmationCode } = await createFacebookDataDeletionRequest({ asid })

  try {
    const matchedConfigs = await findCommuneFacebookConfigsByAsid(asid)
    const revokedCommuneIds: string[] = []

    for (const config of matchedConfigs) {
      try {
        await revokeCommuneFacebookConfig(config.commune_id)
        revokedCommuneIds.push(config.commune_id)
      } catch (revokeError: unknown) {
        const message = revokeError instanceof Error ? revokeError.message : 'erreur inconnue'
        console.error(`[fb-data-deletion] revoke failed for commune ${config.commune_id}: ${message}`)
      }
    }

    if (revokedCommuneIds.length > 0) {
      await markFacebookDataDeletionRequestProcessed({
        confirmationCode,
        status: 'processed',
        revokedCommuneIds,
        notes: `Page Access Tokens revoques pour ${revokedCommuneIds.length} commune(s).`
      })
    } else {
      await markFacebookDataDeletionRequestProcessed({
        confirmationCode,
        status: 'no_data',
        revokedCommuneIds: [],
        notes: 'Aucune connexion Facebook associee a cet identifiant Facebook.'
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'erreur inconnue'
    console.error(`[fb-data-deletion] processing failed for ${confirmationCode}: ${message}`)
    await markFacebookDataDeletionRequestProcessed({
      confirmationCode,
      status: 'failed',
      revokedCommuneIds: [],
      notes: `Echec de traitement: ${message}`
    })
  }

  return {
    url: getStatusUrl(confirmationCode),
    confirmation_code: confirmationCode
  }
})
