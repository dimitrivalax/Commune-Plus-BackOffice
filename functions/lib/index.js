'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.publishScheduledActualites = exports.notifyLicenceExpiry = void 0
const app_1 = require('firebase-admin/app')
const firestore_1 = require('firebase-admin/firestore')
const messaging_1 = require('firebase-admin/messaging')
const scheduler_1 = require('firebase-functions/v2/scheduler')
const firebase_functions_1 = require('firebase-functions')
const node_crypto_1 = require('node:crypto')
const mailer_js_1 = require('./mailer.js');

(0, app_1.initializeApp)()
function getRuntimeProjectId() {
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || ''
}
function getRuntimeDb() {
  const projectId = getRuntimeProjectId()
  if (projectId) {
    return (0, firestore_1.getFirestore)(projectId)
  }
  return (0, firestore_1.getFirestore)()
}
function toDate(value) {
  if (!value)
    return null
  if (value instanceof firestore_1.Timestamp)
    return value.toDate()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return null
  return parsed
}
function toYyyyMmDd(date) {
  return date.toISOString().slice(0, 10)
}
function addOneYear(date) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + 1)
  return next
}
function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
async function sendActualiteNotification(infoId, info) {
  const db = getRuntimeDb()
  const communeId = info.commune_id
  if (!communeId) {
    return 0
  }
  const tokenSnap = await db
    .collection('push_token')
    .where('commune_id', '==', communeId)
    .get()
  const tokens = tokenSnap.docs
    .map(d => d.data())
    .filter(row => row.is_active !== false && typeof row.token === 'string' && row.token.length > 0)
    .map(row => row.token)
  if (!tokens.length) {
    return 0
  }
  const messaging = (0, messaging_1.getMessaging)()
  let sent = 0
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500)
    const result = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: String(info.category || ''),
        body: String(info.title || '')
      },
      data: {
        type: 'actualite',
        info_id: infoId,
        commune_id: String(communeId),
        campaign_key: `actualite_${infoId}`
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    })
    sent += result.successCount
  }
  return sent
}
function decodeHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .trim()
}
function getFacebookGraphApiVersion() {
  const raw = String(process.env.FACEBOOK_GRAPH_API_VERSION || 'v25.0').trim()
  return raw.startsWith('v') ? raw : `v${raw}`
}
function getFacebookGraphApiBaseUrl() {
  return `https://graph.facebook.com/${getFacebookGraphApiVersion()}`
}
function decryptFacebookPageToken(encryptedPayloadRaw) {
  const keyRaw = process.env.FACEBOOK_TOKEN_ENCRYPTION_KEY || ''
  if (!keyRaw)
    return null
  const key = Buffer.from(keyRaw, 'base64')
  if (key.length !== 32)
    return null
  let encryptedPayload
  try {
    encryptedPayload = JSON.parse(encryptedPayloadRaw)
  } catch {
    return null
  }
  const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key, Buffer.from(encryptedPayload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'base64'))
  const plainToken = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, 'base64')),
    decipher.final()
  ])
  return plainToken.toString('utf8')
}
async function publishActualiteOnFacebook(infoId, info) {
  const communeId = info.commune_id
  if (!communeId) {
    return { success: false, error: 'commune_id manquant' }
  }
  const db = getRuntimeDb()
  const facebookConfigSnap = await db.collection('commune_facebook_config').doc(communeId).get()
  if (!facebookConfigSnap.exists) {
    return { success: false, error: 'Configuration Facebook absente' }
  }
  const facebookConfig = facebookConfigSnap.data()
  if (!facebookConfig.page_id || !facebookConfig.encrypted_page_access_token) {
    return { success: false, error: 'Configuration Facebook incomplète' }
  }
  if (facebookConfig.token_status && facebookConfig.token_status !== 'active') {
    return { success: false, error: `Token Facebook ${facebookConfig.token_status}` }
  }
  const pageAccessToken = decryptFacebookPageToken(facebookConfig.encrypted_page_access_token)
  if (!pageAccessToken) {
    return { success: false, error: 'Token Facebook illisible (clé manquante ou invalide)' }
  }
  const title = decodeHtml(String(info.title || ''))
  const content = decodeHtml(String(info.content || ''))
  const message = [title, content].filter(Boolean).join('\n\n').slice(0, 60000)
  const imageUrl = typeof info.image_url === 'string' ? info.image_url : null
  const endpoint = imageUrl
    ? `${getFacebookGraphApiBaseUrl()}/${facebookConfig.page_id}/photos`
    : `${getFacebookGraphApiBaseUrl()}/${facebookConfig.page_id}/feed`
  const body = imageUrl
    ? new URLSearchParams({
        caption: message,
        url: imageUrl,
        access_token: pageAccessToken
      })
    : new URLSearchParams({
        message,
        access_token: pageAccessToken
      })
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.id) {
    return {
      success: false,
      error: json?.error?.message || `HTTP ${response.status}`
    }
  }
  return { success: true, postId: json.id }
}
exports.notifyLicenceExpiry = (0, scheduler_1.onSchedule)({
  schedule: '0 8 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1'
}, async () => {
  const db = getRuntimeDb()
  const now = new Date()
  const targetExpiration = toYyyyMmDd(addDays(now, 45))
  const snapshot = await db.collection('commune').get()
  let sentCount = 0
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const licenceDate = toDate(data.date_licence)
    if (!licenceDate)
      continue
    const expirationDate = addOneYear(licenceDate)
    const expirationYyyyMmDd = toYyyyMmDd(expirationDate)
    if (expirationYyyyMmDd !== targetExpiration)
      continue
    if (data.license_renewal_notified_for_expiration === expirationYyyyMmDd) {
      continue
    }
    const mailResult = await (0, mailer_js_1.sendLicenceExpiryAlertEmail)({
      communeId: doc.id,
      name: data.name || '(sans nom)',
      postalCode: data.postal_code || '(inconnu)',
      email: data.email || '(inconnu)',
      logoUrl: data.logo_url || null,
      dateLicence: toYyyyMmDd(licenceDate),
      dateExpiration: expirationYyyyMmDd
    })
    if (!mailResult.success) {
      firebase_functions_1.logger.error('Echec envoi alerte licence', {
        communeId: doc.id,
        error: mailResult.error
      })
      continue
    }
    sentCount += 1
    await doc.ref.update({
      license_renewal_notified_for_expiration: expirationYyyyMmDd,
      license_renewal_last_notified_at: firestore_1.FieldValue.serverTimestamp()
    })
  }
  firebase_functions_1.logger.info('Alerte licences terminee', {
    targetExpiration,
    communesScanned: snapshot.size,
    sentCount
  })
})
exports.publishScheduledActualites = (0, scheduler_1.onSchedule)({
  schedule: '0 * * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1'
}, async () => {
  try {
    const db = getRuntimeDb()
    const now = new Date()
    const nowIso = now.toISOString()
    const scheduledSnap = await db
      .collection('actualite')
      .where('publication_status', '==', 'scheduled')
      .get()
    const dueDocs = scheduledSnap.docs.filter((doc) => {
      const data = doc.data()
      if (!data.scheduled_publish_at)
        return false
      const scheduledAt = new Date(data.scheduled_publish_at)
      return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() <= now.getTime()
    })
    let publishedCount = 0
    let notifiedCount = 0
    let skippedAlreadyNotified = 0
    let publishErrors = 0
    let notifyErrors = 0
    let facebookPublishedCount = 0
    let facebookErrors = 0
    for (const scheduledDoc of dueDocs) {
      const info = scheduledDoc.data()
      if (info.notification_sent_at) {
        skippedAlreadyNotified += 1
        continue
      }
      try {
        await scheduledDoc.ref.update({
          publication_status: 'published',
          published_at: nowIso,
          updated_at: firestore_1.FieldValue.serverTimestamp()
        })
        publishedCount += 1
      } catch (error) {
        publishErrors += 1
        firebase_functions_1.logger.error('Echec mise a jour publication actualite', {
          infoId: scheduledDoc.id,
          error: error instanceof Error ? error.message : String(error)
        })
        continue
      }
      try {
        const sent = await sendActualiteNotification(scheduledDoc.id, info)
        const patch = {
          notification_sent_at: new Date().toISOString(),
          updated_at: firestore_1.FieldValue.serverTimestamp()
        }
        if (info.publish_facebook_scheduled) {
          const facebookResult = await publishActualiteOnFacebook(scheduledDoc.id, info)
          if (facebookResult.success) {
            facebookPublishedCount += 1
            patch.facebook_post_id = facebookResult.postId || null
            patch.facebook_published_at = new Date().toISOString()
            patch.facebook_error = null
          } else {
            facebookErrors += 1
            patch.facebook_error = facebookResult.error || 'Publication Facebook impossible'
            firebase_functions_1.logger.error('Echec publication Facebook actualite programmee', {
              infoId: scheduledDoc.id,
              error: facebookResult.error || '(unknown)'
            })
          }
        }
        await scheduledDoc.ref.update(patch)
        notifiedCount += sent
      } catch (error) {
        notifyErrors += 1
        firebase_functions_1.logger.error('Echec notification actualite programmee', {
          infoId: scheduledDoc.id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    firebase_functions_1.logger.info('Publication programmee actualites terminee', {
      projectId: getRuntimeProjectId() || '(unknown)',
      scheduledFound: scheduledSnap.size,
      dueCount: dueDocs.length,
      publishedCount,
      notifiedCount,
      facebookPublishedCount,
      facebookErrors,
      skippedAlreadyNotified,
      publishErrors,
      notifyErrors
    })
  } catch (error) {
    firebase_functions_1.logger.error('Erreur scheduler publication actualites', {
      projectId: getRuntimeProjectId() || '(unknown)',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})
// # sourceMappingURL=index.js.map
