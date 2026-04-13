import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
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

export const notifyLicenceExpiry = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const db = getFirestore()
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
        dateExpiration: expirationYyyyMmDd,
      })

      if (!mailResult.success) {
        logger.error('Echec envoi alerte licence', {
          communeId: doc.id,
          error: mailResult.error,
        })
        continue
      }

      sentCount += 1
      await doc.ref.update({
        license_renewal_notified_for_expiration: expirationYyyyMmDd,
        license_renewal_last_notified_at: FieldValue.serverTimestamp(),
      })
    }

    logger.info('Alerte licences terminee', {
      targetExpiration,
      communesScanned: snapshot.size,
      sentCount,
    })
  },
)
