export async function sendEmail(options: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail
    = process.env.RESEND_FROM_EMAIL || 'noreply@commune-plus.fr'

  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not configured in environment variables.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Commune Plus <${resendFromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, '')
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(
        'Resend API error:',
        response.status,
        response.statusText,
        errorData
      )
      return {
        success: false,
        error: `Email service error: ${response.statusText}`
      }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send email'
    console.error('Error sending email via Resend:', error)
    return { success: false, error: message }
  }
}
