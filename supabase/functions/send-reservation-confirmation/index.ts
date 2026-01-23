import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les variables d'environnement (secrets Supabase)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@commune-plus.fr'

    // Vérifier que les secrets sont configurés
    if (!resendApiKey) {
      const errorMessage = 'RESEND_API_KEY is not configured. Please configure it in Supabase Dashboard > Settings > Edge Functions > Secrets.'
      console.error(errorMessage)
      return new Response(
        JSON.stringify({
          error: errorMessage,
          missingSecrets: ['RESEND_API_KEY'],
          hint: 'Configure RESEND_API_KEY in Supabase Dashboard > Settings > Edge Functions > Secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parser les données de la requête
    const reservationData = await req.json()

    // Valider les données requises
    if (!reservationData.email || !reservationData.nom || !reservationData.prenom) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, nom, prenom' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Formater les dates
    const dateDebut = new Date(reservationData.date_debut)
    const dateFin = new Date(reservationData.date_fin)
    const dateDebutFormatted = dateDebut.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const heureDebut = dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const heureFin = dateFin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    // Préparer le sujet de l'email
    const emailSubject = `Confirmation de réservation - ${reservationData.salle_nom || 'Salle municipale'}`

    // Préparer le corps de l'email (HTML)
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de réservation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #10b981; margin-top: 0;">Confirmation de réservation</h1>
    <p>Bonjour ${reservationData.prenom} ${reservationData.nom},</p>
    <p>Votre réservation de salle a été confirmée avec succès.</p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #374151; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Détails de la réservation</h2>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Salle :</td>
        <td style="padding: 8px 0;">${reservationData.salle_nom || 'Non spécifiée'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Adresse :</td>
        <td style="padding: 8px 0;">${reservationData.salle_adresse || 'Non spécifiée'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Date :</td>
        <td style="padding: 8px 0;">${dateDebutFormatted}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Horaires :</td>
        <td style="padding: 8px 0;">${heureDebut} - ${heureFin}</td>
      </tr>
      ${reservationData.nom_association
        ? `
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Association :</td>
        <td style="padding: 8px 0;">${reservationData.nom_association}</td>
      </tr>
      `
        : ''}
    </table>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #374151; margin-top: 0; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Vos coordonnées</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Nom :</td>
        <td style="padding: 8px 0;">${reservationData.nom}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Prénom :</td>
        <td style="padding: 8px 0;">${reservationData.prenom}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Email :</td>
        <td style="padding: 8px 0;">${reservationData.email}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Téléphone :</td>
        <td style="padding: 8px 0;">${reservationData.telephone || 'Non renseigné'}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; color: #065f46;">
      <strong>Important :</strong> Veuillez noter que cette réservation est confirmée. En cas de changement ou d'annulation, merci de nous contacter au plus tôt.
    </p>
  </div>

  <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
    <p>Pour toute question, veuillez contacter votre mairie.</p>
  </div>
</body>
</html>
    `.trim()

    // Préparer la version texte de l'email
    const emailText = `
Confirmation de réservation

Bonjour ${reservationData.prenom} ${reservationData.nom},

Votre réservation de salle a été confirmée avec succès.

Détails de la réservation :
- Salle : ${reservationData.salle_nom || 'Non spécifiée'}
- Adresse : ${reservationData.salle_adresse || 'Non spécifiée'}
- Date : ${dateDebutFormatted}
- Horaires : ${heureDebut} - ${heureFin}
${reservationData.nom_association ? `- Association : ${reservationData.nom_association}\n` : ''}

Vos coordonnées :
- Nom : ${reservationData.nom}
- Prénom : ${reservationData.prenom}
- Email : ${reservationData.email}
- Téléphone : ${reservationData.telephone || 'Non renseigné'}

Important : Veuillez noter que cette réservation est confirmée. En cas de changement ou d'annulation, merci de nous contacter au plus tôt.

Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.
Pour toute question, veuillez contacter votre mairie.
    `.trim()

    // Envoyer l'email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Mairie <${resendFromEmail}>`,
        to: [reservationData.email],
        subject: emailSubject,
        html: emailBody,
        text: emailText
      })
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json().catch(() => ({}))
      throw new Error(`Resend API error: ${resendResponse.status} ${resendResponse.statusText} - ${JSON.stringify(errorData)}`)
    }

    const resendData = await resendResponse.json()
    console.log('Email sent successfully via Resend:', resendData.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Confirmation email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send confirmation email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
