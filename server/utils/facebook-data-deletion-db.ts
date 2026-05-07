import { randomBytes } from 'node:crypto'
import { getAdminFirestore } from './firebase-admin-app'

export type FacebookDataDeletionStatus = 'received' | 'processed' | 'no_data' | 'failed'

export interface FacebookDataDeletionRequest {
  asid: string
  confirmation_code: string
  status: FacebookDataDeletionStatus
  requested_at: string
  processed_at?: string
  revoked_commune_ids?: string[]
  notes?: string
}

const COLLECTION = 'facebook_data_deletion_requests'
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 16

function generateConfirmationCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]
  }
  return code
}

export async function createFacebookDataDeletionRequest(input: {
  asid: string
}): Promise<{ confirmationCode: string }> {
  const db = getAdminFirestore()
  const now = new Date().toISOString()

  // Boucle defensive (collision quasi nulle, mais on s'assure de l'unicite).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateConfirmationCode()
    const ref = db.collection(COLLECTION).doc(code)
    const existing = await ref.get()
    if (existing.exists) continue

    const doc: FacebookDataDeletionRequest = {
      asid: input.asid,
      confirmation_code: code,
      status: 'received',
      requested_at: now
    }
    await ref.set(doc)
    return { confirmationCode: code }
  }

  throw createError({
    statusCode: 500,
    message: 'Impossible de generer un code de confirmation unique'
  })
}

export async function markFacebookDataDeletionRequestProcessed(input: {
  confirmationCode: string
  status: FacebookDataDeletionStatus
  revokedCommuneIds?: string[]
  notes?: string
}): Promise<void> {
  const db = getAdminFirestore()
  await db.collection(COLLECTION).doc(input.confirmationCode).set(
    {
      status: input.status,
      processed_at: new Date().toISOString(),
      revoked_commune_ids: input.revokedCommuneIds ?? [],
      notes: input.notes ?? ''
    },
    { merge: true }
  )
}

export async function getFacebookDataDeletionRequest(
  confirmationCode: string
): Promise<FacebookDataDeletionRequest | null> {
  const db = getAdminFirestore()
  const snap = await db.collection(COLLECTION).doc(confirmationCode).get()
  if (!snap.exists) return null
  return snap.data() as FacebookDataDeletionRequest
}
