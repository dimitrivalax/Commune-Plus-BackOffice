import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { sendLicenceExpiryAlertEmail } from './mailer.js'

initializeApp()

type CommuneDoc = {
  name?: string
  postal_code?: string
  email?: string
  logo_url?: string | null
  date_licence?: string | Timestamp | null
  license_renewal_notified_for_expiration?: string | null
}

type PushTokenDoc = {
  token?: string
  is_active?: boolean
}

type ActualiteDoc = {
  title?: string
  category?: string | null
  commune_id?: string | null
  publication_status?: 'draft' | 'scheduled' | 'published'
  scheduled_publish_at?: string | null
  notification_sent_at?: string | null
}

function getRuntimeProjectId(): string {
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || ''
}

function getRuntimeDb() {
  const projectId = getRuntimeProjectId()
  if (projectId) {
    return getFirestore(projectId)
  }
  return getFirestore()
}

function toDate(value: CommuneDoc['date_licence']): Date | null {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function toYyyyMmDd(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addOneYear(date: Date) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + 1)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

async function sendActualiteNotification(infoId: string, info: ActualiteDoc): Promise<number> {
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
    .map(d => d.data() as PushTokenDoc)
    .filter(row => row.is_active !== false && typeof row.token === 'string' && row.token.length > 0)
    .map(row => row.token as string)

  if (!tokens.length) {
    return 0
  }

  const messaging = getMessaging()
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

export const notifyLicenceExpiry = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1'
  },
  async () => {
    const db = getRuntimeDb()
    const now = new Date()
    const targetExpiration = toYyyyMmDd(addDays(now, 45))

    const snapshot = await db.collection('commune').get()
    let sentCount = 0

    for (const doc of snapshot.docs) {
      const data = doc.data() as CommuneDoc
      const licenceDate = toDate(data.date_licence)
      if (!licenceDate) continue

      const expirationDate = addOneYear(licenceDate)
      const expirationYyyyMmDd = toYyyyMmDd(expirationDate)
      if (expirationYyyyMmDd !== targetExpiration) continue

      if (data.license_renewal_notified_for_expiration === expirationYyyyMmDd) {
        continue
      }

      const mailResult = await sendLicenceExpiryAlertEmail({
        communeId: doc.id,
        name: data.name || '(sans nom)',
        postalCode: data.postal_code || '(inconnu)',
        email: data.email || '(inconnu)',
        logoUrl: data.logo_url || null,
        dateLicence: toYyyyMmDd(licenceDate),
        dateExpiration: expirationYyyyMmDd
      })

      if (!mailResult.success) {
        logger.error('Echec envoi alerte licence', {
          communeId: doc.id,
          error: mailResult.error
        })
        continue
      }

      sentCount += 1
      await doc.ref.update({
        license_renewal_notified_for_expiration: expirationYyyyMmDd,
        license_renewal_last_notified_at: FieldValue.serverTimestamp()
      })
    }

    logger.info('Alerte licences terminee', {
      targetExpiration,
      communesScanned: snapshot.size,
      sentCount
    })
  }
)

export const publishScheduledActualites = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1'
  },
  async () => {
    try {
      const db = getRuntimeDb()
      const now = new Date()
      const nowIso = now.toISOString()
      const scheduledSnap = await db
        .collection('actualite')
        .where('publication_status', '==', 'scheduled')
        .get()

      const dueDocs = scheduledSnap.docs.filter((doc) => {
        const data = doc.data() as ActualiteDoc
        if (!data.scheduled_publish_at) return false
        const scheduledAt = new Date(data.scheduled_publish_at)
        return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() <= now.getTime()
      })
      let publishedCount = 0
      let notifiedCount = 0
      let skippedAlreadyNotified = 0
      let publishErrors = 0
      let notifyErrors = 0

      for (const scheduledDoc of dueDocs) {
        const info = scheduledDoc.data() as ActualiteDoc
        if (info.notification_sent_at) {
          skippedAlreadyNotified += 1
          continue
        }

        try {
          await scheduledDoc.ref.update({
            publication_status: 'published',
            published_at: nowIso,
            updated_at: FieldValue.serverTimestamp()
          })
          publishedCount += 1
        } catch (error: unknown) {
          publishErrors += 1
          logger.error('Echec mise a jour publication actualite', {
            infoId: scheduledDoc.id,
            error: error instanceof Error ? error.message : String(error)
          })
          continue
        }

        try {
          const sent = await sendActualiteNotification(scheduledDoc.id, info)
          await scheduledDoc.ref.update({
            notification_sent_at: new Date().toISOString(),
            updated_at: FieldValue.serverTimestamp()
          })
          notifiedCount += sent
        } catch (error: unknown) {
          notifyErrors += 1
          logger.error('Echec notification actualite programmee', {
            infoId: scheduledDoc.id,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      logger.info('Publication programmee actualites terminee', {
        projectId: getRuntimeProjectId() || '(unknown)',
        scheduledFound: scheduledSnap.size,
        dueCount: dueDocs.length,
        publishedCount,
        notifiedCount,
        skippedAlreadyNotified,
        publishErrors,
        notifyErrors
      })
    } catch (error: unknown) {
      logger.error('Erreur scheduler publication actualites', {
        projectId: getRuntimeProjectId() || '(unknown)',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
)
