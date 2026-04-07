/**
 * Remplace les Edge Functions Supabase (Resend) pour e-mails transactionnels.
 */

export interface ReservationConfirmationPayload {
  email: string
  nom: string
  prenom: string
  telephone?: string | null
  nom_association?: string | null
  date_debut: string
  date_fin: string
  salle_nom?: string | null
  salle_adresse?: string | null
}

export async function sendReservationConfirmationEmail(
  reservationData: ReservationConfirmationPayload,
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail
    = process.env.RESEND_FROM_EMAIL || 'noreply@commune-plus.fr'

  if (!resendApiKey) {
    return {
      success: false,
      error:
        'RESEND_API_KEY is not configured',
    }
  }

  const dateDebut = new Date(reservationData.date_debut)
  const dateFin = new Date(reservationData.date_fin)
  const dateDebutFormatted = dateDebut.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const heureDebut = dateDebut.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const heureFin = dateFin.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const emailSubject = `Confirmation de réservation - ${reservationData.salle_nom || 'Salle municipale'}`

  const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #10b981; margin-top: 0;">Confirmation de réservation</h1>
    <p>Bonjour ${reservationData.prenom} ${reservationData.nom},</p>
    <p>Votre réservation de salle a été confirmée avec succès.</p>
  </div>
  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #374151; margin-top: 0;">Détails de la réservation</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Salle :</td><td>${reservationData.salle_nom || 'Non spécifiée'}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Adresse :</td><td>${reservationData.salle_adresse || 'Non spécifiée'}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Date :</td><td>${dateDebutFormatted}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Horaires :</td><td>${heureDebut} - ${heureFin}</td></tr>
      ${reservationData.nom_association ? `<tr><td style="padding: 8px 0; font-weight: bold;">Association :</td><td>${reservationData.nom_association}</td></tr>` : ''}
    </table>
  </div>
  <p style="font-size: 12px; color: #6b7280;">Cet email a été envoyé automatiquement. Pour toute question, contactez votre mairie.</p>
</body>
</html>`.trim()

  const emailText = `
Confirmation de réservation
Bonjour ${reservationData.prenom} ${reservationData.nom},
Salle : ${reservationData.salle_nom || ''}
${dateDebutFormatted} ${heureDebut}-${heureFin}
`.trim()

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Mairie <${resendFromEmail}>`,
      to: [reservationData.email],
      subject: emailSubject,
      html: emailBody,
      text: emailText,
    }),
  })

  if (!resendResponse.ok) {
    const errorData = await resendResponse.json().catch(() => ({}))
    return {
      success: false,
      error: `Resend: ${resendResponse.status} ${JSON.stringify(errorData)}`,
    }
  }

  return { success: true }
}

export interface SignalementEmailPayload {
  firstName: string
  lastName: string
  email?: string | null
  commune: string
  description: string
  photoUrl?: string | null
  address?: string | null
  mairieEmail: string
}

export async function sendSignalementEmailToMairie(
  signalementData: SignalementEmailPayload,
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail
    = process.env.RESEND_FROM_EMAIL || 'noreply@commune-plus.fr'

  if (!resendApiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured' }
  }

  let emailText = `Madame, Monsieur,

Je vous écris pour vous signaler le point suivant concernant notre commune.

${signalementData.address ? `Lieu : ${signalementData.address}\n\n` : ''}${signalementData.description}`

  if (signalementData.photoUrl) {
    emailText += `\n\nPhoto : ${signalementData.photoUrl}`
  }

  emailText += `

Je vous remercie pour votre attention et votre suivi.

Cordialement,
${signalementData.firstName} ${signalementData.lastName}

---
Ce mail a été créé avec Commune Plus.`

  let emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Madame, Monsieur,</p>
  <p>Je vous écris pour vous signaler le point suivant concernant notre commune.</p>
  ${signalementData.address ? `<p>${signalementData.address}</p>` : ''}
  <p>${signalementData.description}</p>
  ${signalementData.photoUrl ? `<p><a href="${signalementData.photoUrl}">Photo</a></p>` : ''}
  <p>Cordialement,<br>${signalementData.firstName} ${signalementData.lastName}</p>
</body></html>`.trim()

  const emailSubject = `Signalement — ${signalementData.firstName} ${signalementData.lastName}`

  const payload: Record<string, unknown> = {
    from: `${signalementData.firstName} ${signalementData.lastName} <${resendFromEmail}>`,
    to: [signalementData.mairieEmail],
    subject: emailSubject,
    html: emailHtml,
    text: emailText,
  }

  if (signalementData.email?.includes('@')) {
    payload.reply_to = signalementData.email
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!resendResponse.ok) {
    const errorData = await resendResponse.json().catch(() => ({}))
    return {
      success: false,
      error: `Resend: ${resendResponse.status} ${JSON.stringify(errorData)}`,
    }
  }

  return { success: true }
}
