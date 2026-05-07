import {
  getFacebookDataDeletionRequest,
  type FacebookDataDeletionRequest,
  type FacebookDataDeletionStatus
} from '../../utils/facebook-data-deletion-db'

const CONTACT_EMAIL = 'contact@commune-plus.fr'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function statusLabel(status: FacebookDataDeletionStatus): string {
  switch (status) {
    case 'processed':
      return 'Donnees supprimees'
    case 'no_data':
      return 'Aucune donnee a supprimer'
    case 'failed':
      return 'Echec du traitement'
    case 'received':
    default:
      return 'Demande recue'
  }
}

function statusDescription(request: FacebookDataDeletionRequest): string {
  switch (request.status) {
    case 'processed': {
      const count = request.revoked_commune_ids?.length ?? 0
      return `Vos donnees Facebook stockees dans Commune+ ont ete supprimees. ${count} connexion(s) de Page Facebook ont ete revoquees.`
    }
    case 'no_data':
      return 'Aucune donnee Facebook associee a votre identifiant n\'etait stockee dans Commune+. La demande est cloturee.'
    case 'failed':
      return `Le traitement automatique a echoue. Merci de nous contacter a ${CONTACT_EMAIL} en precisant votre code de confirmation.`
    case 'received':
    default:
      return 'Votre demande a ete enregistree et est en cours de traitement.'
  }
}

function renderPage(opts: {
  title: string
  bodyHtml: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 2rem 1.25rem; line-height: 1.55; color: #111; background: #fff; }
  h1 { font-size: 1.5rem; margin: 0 0 1rem; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem 1.5rem; background: #fafafa; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem; margin: 1rem 0 0; }
  dt { font-weight: 600; color: #374151; }
  dd { margin: 0; word-break: break-all; }
  .badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; background: #e0f2fe; color: #075985; font-size: 0.85rem; font-weight: 600; }
  .badge.processed { background: #dcfce7; color: #166534; }
  .badge.failed { background: #fee2e2; color: #991b1b; }
  .badge.no_data { background: #f3f4f6; color: #374151; }
  footer { margin-top: 2rem; font-size: 0.85rem; color: #6b7280; }
  a { color: #1d4ed8; }
  @media (prefers-color-scheme: dark) {
    body { color: #f3f4f6; background: #0b1120; }
    .card { background: #111827; border-color: #1f2937; }
    dt { color: #d1d5db; }
    footer { color: #9ca3af; }
  }
</style>
</head>
<body>
${opts.bodyHtml}
<footer>
  Une question ? Ecrivez-nous a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
</footer>
</body>
</html>`
}

export default eventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')

  const query = getQuery(event)
  const confirmationCode = typeof query.id === 'string' ? query.id.trim() : ''

  if (!confirmationCode) {
    setResponseStatus(event, 400)
    return renderPage({
      title: 'Code manquant - Commune+',
      bodyHtml: `
        <h1>Code de confirmation manquant</h1>
        <p>Veuillez fournir un code de confirmation valide via le parametre <code>?id=</code>.</p>
      `
    })
  }

  const request = await getFacebookDataDeletionRequest(confirmationCode)
  if (!request) {
    setResponseStatus(event, 404)
    return renderPage({
      title: 'Demande introuvable - Commune+',
      bodyHtml: `
        <h1>Demande introuvable</h1>
        <p>Aucune demande de suppression de donnees Facebook ne correspond au code <strong>${escapeHtml(confirmationCode)}</strong>.</p>
        <p>Si vous pensez qu'il s'agit d'une erreur, contactez-nous a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
      `
    })
  }

  const badgeClass = request.status
  return renderPage({
    title: `Statut de la suppression de donnees Facebook - Commune+`,
    bodyHtml: `
      <h1>Suppression de donnees Facebook</h1>
      <div class="card">
        <p><span class="badge ${escapeHtml(badgeClass)}">${escapeHtml(statusLabel(request.status))}</span></p>
        <p>${escapeHtml(statusDescription(request))}</p>
        <dl>
          <dt>Code de confirmation</dt><dd><code>${escapeHtml(request.confirmation_code)}</code></dd>
          <dt>Demande recue le</dt><dd>${escapeHtml(formatDate(request.requested_at))}</dd>
          <dt>Traitee le</dt><dd>${escapeHtml(formatDate(request.processed_at))}</dd>
        </dl>
      </div>
    `
  })
})
