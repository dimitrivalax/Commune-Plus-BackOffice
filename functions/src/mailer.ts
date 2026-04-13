export interface LicenceAlertMailPayload {
  communeId: string
  name: string
  postalCode: string
  email: string
  logoUrl?: string | null
  dateLicence: string
  dateExpiration: string
}

function formatDateFr(dateIso: string) {
  return new Date(dateIso).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function sendLicenceExpiryAlertEmail(
  payload: LicenceAlertMailPayload,
): Promise<{ success: boolean, error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'contact@commune-plus.fr'
  const alertTo = process.env.LICENSE_ALERT_TO_EMAIL || 'contact@commune-plus.fr'

  if (!resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured' }
  }

  const formattedDateLicence = formatDateFr(payload.dateLicence)
  const formattedDateExpiration = formatDateFr(payload.dateExpiration)

  const subject = `Licence commune bientot expiree - ${payload.name}`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
  <h2 style="margin: 0 0 16px;">Alerte expiration de licence</h2>
  <p>La licence de la commune ci-dessous va bientot expirer. Merci de la contacter pour prolongation.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; font-weight: bold; width: 40%;">ID commune :</td><td>${payload.communeId}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Nom :</td><td>${payload.name}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Code postal :</td><td>${payload.postalCode}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Email :</td><td>${payload.email}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Date de licence :</td><td>${formattedDateLicence}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Date d'expiration :</td><td>${formattedDateExpiration}</td></tr>
  </table>
  ${payload.logoUrl ? `<p><img src="${payload.logoUrl}" alt="Logo ${payload.name}" style="max-height: 100px; max-width: 280px; object-fit: contain;" /></p>` : ''}
  <p style="font-size: 12px; color: #666;">Email automatique Commune Plus.</p>
</body>
</html>`.trim()

  const text = `
Alerte expiration de licence
La licence de la commune suivante va bientot expirer.
ID commune: ${payload.communeId}
Nom: ${payload.name}
Code postal: ${payload.postalCode}
Email: ${payload.email}
Date de licence: ${formattedDateLicence}
Date d'expiration: ${formattedDateExpiration}
Action requise: contacter la commune pour prolongation.
`.trim()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Commune Plus <${resendFromEmail}>`,
      to: [alertTo],
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    return {
      success: false,
      error: `Resend: ${response.status} ${JSON.stringify(errorData)}`,
    }
  }

  return { success: true }
}
