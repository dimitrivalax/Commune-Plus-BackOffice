import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function logFirebaseAdminProjectId(sa: Record<string, unknown>) {
  const projectId = String(sa.project_id || '').trim() || '<missing>'
  const databaseId = process.env.FIREBASE_DATABASE_NAME || '(default)'
  console.info(
    `[firebase-admin] initialized with project_id="${projectId}" database_id="${databaseId}"`
  )
}

function loadServiceAccountJson(): Record<string, unknown> {
  const raw
    = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      || process.env.FCM_SERVICE_ACCOUNT_JSON
      || ''
  if (!raw.trim()) {
    throw new Error(
      'Missing FIREBASE_SERVICE_ACCOUNT_JSON (or FCM_SERVICE_ACCOUNT_JSON) for Firebase Admin'
    )
  }
  let jsonToParse = raw.trim()
  if (jsonToParse.startsWith('"') && jsonToParse.endsWith('"')) {
    try {
      const once = JSON.parse(jsonToParse) as unknown
      if (typeof once === 'string') jsonToParse = once.trim()
      else if (typeof once === 'object' && once !== null) return once as Record<string, unknown>
    } catch {
      jsonToParse = jsonToParse.slice(1, -1).trim()
    }
  }
  return JSON.parse(jsonToParse) as Record<string, unknown>
}

let app: App | null = null

export function getFirebaseAdminApp(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]!
    return app
  }
  const sa = loadServiceAccountJson()
  logFirebaseAdminProjectId(sa)
  app = initializeApp({
    credential: cert(sa as Parameters<typeof cert>[0])
  })
  return app
}

export function getAdminFirestore() {
  const databaseId = process.env.FIREBASE_DATABASE_NAME || '(default)'
  return getFirestore(getFirebaseAdminApp(), databaseId)
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}
