import { sendSignalementEmailToMairie } from '../../utils/resend-transactional'

/**
 * Endpoint public (remplace l’Edge Function Supabase) pour l’envoi d’e-mail signalement depuis l’app mobile.
 */
export default eventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method not allowed' })
  }
  const body = await readBody(event)
  const result = await sendSignalementEmailToMairie(body)
  if (!result.success) {
    throw createError({
      statusCode: 500,
      message: result.error || 'Échec envoi e-mail',
    })
  }
  return { success: true, message: 'Email sent successfully' }
})
