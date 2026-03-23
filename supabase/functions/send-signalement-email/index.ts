// Edge Function Supabase pour envoyer un email de signalement via Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const signalementData = await req.json()

    // Valider les données requises
    if (!signalementData.firstName || !signalementData.lastName || !signalementData.commune || !signalementData.description || !signalementData.mairieEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construire le contenu de l'email (ton personnel : la mairie reçoit comme si c'était l'habitant qui écrit)
    const emailSubject = `Signalement — ${signalementData.firstName} ${signalementData.lastName}`
    
    // Version texte de l'email (rédigé à la première personne, au nom de l'habitant)
    let emailText = `Madame, Monsieur,

Je vous écris pour vous signaler le point suivant concernant notre commune.

${signalementData.address ? `Lieu : ${signalementData.address}\n\n` : ''}${signalementData.description}`

    // Ajouter l'URL de la photo si disponible
    if (signalementData.photoUrl) {
      emailText += `\n\nPhoto : ${signalementData.photoUrl}`
    }

    emailText += `

Je vous remercie pour votre attention et votre suivi.

Cordialement,
${signalementData.firstName} ${signalementData.lastName}

---
Ce mail a été créé avec la solution Commune Plus, l'application qui simplifie la communication entre habitants et mairie.
Si vous souhaitez en savoir plus : https://commune-plus.fr`

    // Version HTML de l'email (corps personnel, pied de page Commune Plus)
    let emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signalement</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="margin-bottom: 24px;">
    <p>Madame, Monsieur,</p>
    <p>Je vous écris pour vous signaler le point suivant concernant notre commune.</p>
    ${signalementData.address ? `<p> ${signalementData.address}</p>` : ''}
    <p>${signalementData.description}</p>
    
    ${signalementData.photoUrl ? `
        <img src="${signalementData.photoUrl}" alt="Photo du signalement" style="max-width: 100%; height: auto; margin-top: 20px;">
        <a href="${signalementData.photoUrl}"  target="_blank">Voir la photo</a>
      ` : ''}
  </div>
  </div>

  <p>Je vous remercie pour votre attention et votre suivi.</p>
  <p>Cordialement,<br>${signalementData.firstName} ${signalementData.lastName}</p>

  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    <p>Ce mail a été créé avec la solution <strong>Commune Plus</strong>, l'application qui simplifie la communication entre habitants et mairie.</p>
    <p>Si vous souhaitez en savoir plus : <a href="https://commune-plus.fr" style="color: #10b981; text-decoration: none;">commune-plus.fr</a></p>
  </div>
</body>
</html>
    `.trim()

    // Préparer les options d'envoi Resend
    const resendPayload: any = {
      from: `${signalementData.firstName} ${signalementData.lastName} <${resendFromEmail}>`,
      to: [signalementData.mairieEmail],
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      reply_to: [signalementData.email, resendFromEmail]
    }

    // Ajouter Reply-To avec l'email de l'utilisateur si disponible
    // Cela permet à la mairie de répondre directement à l'utilisateur
    if (signalementData.email && signalementData.email.includes('@')) {
      resendPayload.reply_to = signalementData.email
    }

    // Envoyer l'email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resendPayload)
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json().catch(() => ({}))
      throw new Error(`Resend API error: ${resendResponse.status} ${resendResponse.statusText} - ${JSON.stringify(errorData)}`)
    }

    const resendData = await resendResponse.json()
    console.log('Email sent successfully via Resend:', resendData.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

