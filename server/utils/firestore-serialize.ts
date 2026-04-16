import type { DocumentData, Timestamp } from 'firebase-admin/firestore'

function isTimestamp(v: unknown): v is Timestamp {
  return (
    v !== null
    && typeof v === 'object'
    && typeof (v as Timestamp).toDate === 'function'
  )
}

/** Sérialise récursivement les Timestamp Firestore en ISO pour les réponses JSON. */
export function serializeFirestoreData<T>(value: T): T {
  if (isTimestamp(value)) {
    return value.toDate().toISOString() as T
  }
  if (value === null || value === undefined) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(item => serializeFirestoreData(item)) as T
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeFirestoreData(v)
    }
    return out as T
  }
  return value
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function docWithId(
  id: string,
  data: DocumentData | undefined
): Record<string, unknown> | null {
  if (!data) return null
  const plain = { id, ...data } as Record<string, unknown>
  return serializeFirestoreData(plain)
}
