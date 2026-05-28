import {
  requireAuth,
  requireCurrentUserProfile
} from '../../utils/firebase-auth'
import { queryPosthogHogQL } from '../../utils/posthog-server'
import { getAdminFirestore } from '../../utils/firebase-admin-app'

type StatsRow = Record<string, unknown>
type StatsMobileResponse = {
  filters: {
    commune_id: string | null
    period: string
    start: string
    end: string
    mobile_only: boolean
  }
  kpis: {
    unique_actualites_views: number
    unique_propositions_views: number
    signalements_count: number
    unique_notification_clicks: number
    connected_users_count: number
  }
  top_actualites: Array<{ id: string, title: string, unique_views: number }>
  top_propositions: Array<{ id: string, title: string, unique_views: number }>
  notifications_performance: Array<{
    notification_id: string
    target_type: string
    target_id: string
    target_title: string
    sent_total: number
    unique_clicks: number
    ctr_percent: number
  }>
}

const STATS_MOBILE_CACHE_TTL_MS = 60_000
const statsMobileCache = new Map<string, { expiresAt: number, value: StatsMobileResponse }>()

function toSqlString(value: string) {
  return `'${value.replace(/'/g, '\\\'')}'`
}

function parseDateInput(value: string | undefined) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function isoDateTime(d: Date) {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function getStatsMobileCacheKey(input: {
  period: string
  requestedCommuneId: string
  startRaw: string
  endRaw: string
  role: string
  allowedCommuneIds: string[]
}) {
  return JSON.stringify({
    period: input.period,
    requestedCommuneId: input.requestedCommuneId,
    startRaw: input.startRaw,
    endRaw: input.endRaw,
    role: input.role,
    allowedCommuneIds: [...input.allowedCommuneIds].sort()
  })
}

function getCachedStatsMobile(cacheKey: string) {
  const cached = statsMobileCache.get(cacheKey)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    statsMobileCache.delete(cacheKey)
    return null
  }
  return cached.value
}

function setCachedStatsMobile(cacheKey: string, value: StatsMobileResponse) {
  const now = Date.now()
  for (const [key, entry] of statsMobileCache.entries()) {
    if (entry.expiresAt <= now) {
      statsMobileCache.delete(key)
    }
  }
  statsMobileCache.set(cacheKey, {
    value,
    expiresAt: now + STATS_MOBILE_CACHE_TTL_MS
  })
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function countConnectedUsersByCommuneScope(
  communeId: string,
  isGlobalAdmin: boolean,
  allowedCommuneIds: string[]
) {
  const db = getAdminFirestore()
  const deviceIds = new Set<string>()

  const collectFromSnapshot = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    for (const doc of docs) {
      if (doc.get('is_active') === false) continue
      const deviceId = String(doc.get('device_id') || '').trim()
      if (!deviceId) continue
      deviceIds.add(deviceId)
    }
  }

  if (communeId) {
    const snap = await db
      .collection('push_token')
      .where('commune_id', '==', communeId)
      .get()
    collectFromSnapshot(snap.docs)
    return deviceIds.size
  }

  if (!isGlobalAdmin) {
    if (allowedCommuneIds.length === 0) return 0
    for (const communeIdChunk of chunkArray(allowedCommuneIds, 30)) {
      const snap = await db
        .collection('push_token')
        .where('commune_id', 'in', communeIdChunk)
        .get()
      collectFromSnapshot(snap.docs)
    }
    return deviceIds.size
  }

  const snap = await db.collection('push_token').get()
  collectFromSnapshot(snap.docs)
  return deviceIds.size
}

async function loadTitles(collectionName: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const db = getAdminFirestore()
  const refs = ids.map(id => db.collection(collectionName).doc(id))
  const snaps = await db.getAll(...refs)
  const map = new Map<string, string>()
  for (const snap of snaps) {
    if (!snap.exists) continue
    const data = snap.data() || {}
    const title = String(
      (data.title as string | undefined)
      || (data.name as string | undefined)
      || snap.id
    )
    map.set(snap.id, title)
  }
  return map
}

export default eventHandler(async (event) => {
  await requireAuth(event)
  const profile = await requireCurrentUserProfile(event)

  const query = getQuery(event)
  const period = String(query.period || '30d')
  const requestedCommuneId = query.commune_id ? String(query.commune_id) : ''
  const rawStart = typeof query.start === 'string' ? query.start : ''
  const rawEnd = typeof query.end === 'string' ? query.end : ''

  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(now.getDate() - (period === '7d' ? 7 : 30))

  const startDate = parseDateInput(
    typeof query.start === 'string' ? query.start : undefined
  ) || defaultStart
  const endDate = parseDateInput(
    typeof query.end === 'string' ? query.end : undefined
  ) || now

  const isGlobalAdmin = profile.role === 'administrateur'
  const allowedCommuneIds = profile.communeIds || []
  const communeId = requestedCommuneId || (isGlobalAdmin ? '' : allowedCommuneIds[0] || '')

  if (!isGlobalAdmin && communeId && !allowedCommuneIds.includes(communeId)) {
    throw createError({
      statusCode: 403,
      message: 'Vous n\'avez pas la permission d\'acceder a cette commune'
    })
  }

  const cacheKey = getStatsMobileCacheKey({
    period,
    requestedCommuneId,
    startRaw: rawStart,
    endRaw: rawEnd,
    role: profile.role,
    allowedCommuneIds
  })
  const cachedResponse = getCachedStatsMobile(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  const mobileFilter = 'coalesce(properties.platform, \'\') IN (\'ios\',\'android\')'
  const timeFilter = `timestamp >= toDateTime(${toSqlString(isoDateTime(startDate))}) AND timestamp <= toDateTime(${toSqlString(isoDateTime(endDate))})`
  const communeFilter = communeId
    ? `AND properties.commune_id = ${toSqlString(communeId)}`
    : ''

  const [
    topActualitesRows,
    topPropositionsRows,
    signalementRows,
    connectedUsersCount
  ] = await Promise.all([
    queryPosthogHogQL(`
      SELECT
        actualite_id,
        count(DISTINCT distinct_id) AS unique_views
      FROM (
        SELECT
          nullIf(toString(properties.actualite_id), '') AS actualite_id,
          distinct_id
        FROM events
        WHERE event = 'actualite_viewed'
          AND ${timeFilter}
          AND ${mobileFilter}
          ${communeFilter}
      )
      WHERE actualite_id IS NOT NULL
      GROUP BY actualite_id
      ORDER BY unique_views DESC
      LIMIT 10
    `),
    queryPosthogHogQL(`
      SELECT
        proposition_id,
        count(DISTINCT distinct_id) AS unique_views
      FROM (
        SELECT
          nullIf(toString(properties.proposition_id), '') AS proposition_id,
          distinct_id
        FROM events
        WHERE event = 'proposition_viewed'
          AND ${timeFilter}
          AND ${mobileFilter}
          ${communeFilter}
      )
      WHERE proposition_id IS NOT NULL
      GROUP BY proposition_id
      ORDER BY unique_views DESC
      LIMIT 10
    `),
    queryPosthogHogQL(`
      SELECT count(*) AS total
      FROM events
      WHERE event = 'signalement_submitted'
        AND ${timeFilter}
        AND ${mobileFilter}
        ${communeFilter}
    `),
    countConnectedUsersByCommuneScope(
      communeId,
      isGlobalAdmin,
      allowedCommuneIds
    )
  ])

  let notificationsRows: StatsRow[] = []
  let uniqueNotificationClicksTotal = 0
  try {
    const [notificationsPerformanceRows, uniqueNotificationClicksRows] = await Promise.all([
      queryPosthogHogQL(`
        SELECT
          sent.notification_id AS notification_id,
          sent.target_type AS target_type,
          sent.target_id AS target_id,
          sent.sent_events AS sent_events,
          coalesce(clicked.unique_clicks, 0) AS unique_clicks
        FROM (
          SELECT
            nullIf(toString(properties.notification_id), '') AS notification_id,
            any(toString(properties.target_type)) AS target_type,
            any(toString(properties.target_id)) AS target_id,
            count() AS sent_events
          FROM events
          WHERE event = 'notification_sent'
            AND ${timeFilter}
            AND toString(properties.target_type) IN ('actualite', 'proposition')
            ${communeFilter}
          GROUP BY notification_id
          HAVING notification_id IS NOT NULL
        ) AS sent
        LEFT JOIN (
          SELECT
            nullIf(toString(properties.notification_id), '') AS notification_id,
            count(DISTINCT distinct_id) AS unique_clicks
          FROM events
          WHERE event = 'notification_clicked'
            AND ${timeFilter}
            AND ${mobileFilter}
            AND toString(properties.target_type) IN ('actualite', 'proposition')
            ${communeFilter}
          GROUP BY notification_id
          HAVING notification_id IS NOT NULL
        ) AS clicked
        ON sent.notification_id = clicked.notification_id
        ORDER BY unique_clicks DESC, sent_events DESC
        LIMIT 20
      `),
      queryPosthogHogQL(`
        SELECT count(DISTINCT distinct_id) AS total
        FROM events
        WHERE event = 'notification_clicked'
          AND ${timeFilter}
          AND ${mobileFilter}
          ${communeFilter}
      `)
    ])
    notificationsRows = notificationsPerformanceRows
    uniqueNotificationClicksTotal = toNumber(uniqueNotificationClicksRows[0]?.total)
  } catch (error) {
    console.warn('[stats-mobile] notifications_performance fallback to empty:', error)
    notificationsRows = []
    uniqueNotificationClicksTotal = 0
  }

  const actualiteIds = topActualitesRows
    .map(row => String(row.actualite_id || ''))
    .filter(Boolean)
  const propositionIds = topPropositionsRows
    .map(row => String(row.proposition_id || ''))
    .filter(Boolean)
  const notificationActualiteIds = notificationsRows
    .filter(row => String(row.target_type || '') === 'actualite')
    .map(row => String(row.target_id || ''))
    .filter(Boolean)
  const notificationPropositionIds = notificationsRows
    .filter(row => String(row.target_type || '') === 'proposition')
    .map(row => String(row.target_id || ''))
    .filter(Boolean)

  const [actualiteTitles, propositionTitles] = await Promise.all([
    loadTitles('actualite', [...new Set([...actualiteIds, ...notificationActualiteIds])]),
    loadTitles('proposition', [...new Set([...propositionIds, ...notificationPropositionIds])])
  ])

  const topActualites = topActualitesRows
    .map((row: StatsRow) => {
      const id = String(row.actualite_id || '')
      const title = actualiteTitles.get(id)
      if (!title) return null
      return {
        id,
        title,
        unique_views: toNumber(row.unique_views)
      }
    })
    .filter((item): item is { id: string, title: string, unique_views: number } => item !== null)

  const topPropositions = topPropositionsRows
    .map((row: StatsRow) => {
      const id = String(row.proposition_id || '')
      const title = propositionTitles.get(id)
      if (!title) return null
      return {
        id,
        title,
        unique_views: toNumber(row.unique_views)
      }
    })
    .filter((item): item is { id: string, title: string, unique_views: number } => item !== null)

  const notifications = notificationsRows
    .map((row: StatsRow) => {
      const targetType = String(row.target_type || 'other')
      const targetId = String(row.target_id || '')
      const sentTotal = toNumber(row.sent_events, 0)
      const uniqueClicks = toNumber(row.unique_clicks)
      const ctr = sentTotal > 0 ? Math.round((uniqueClicks / sentTotal) * 1000) / 10 : 0

      const targetTitle
        = targetType === 'actualite'
          ? actualiteTitles.get(targetId)
          : targetType === 'proposition'
            ? propositionTitles.get(targetId)
            : targetId || 'N/A'

      if (!targetTitle) {
        return null
      }

      return {
        notification_id: String(row.notification_id || ''),
        target_type: targetType,
        target_id: targetId,
        target_title: targetTitle,
        sent_total: sentTotal,
        unique_clicks: uniqueClicks,
        ctr_percent: ctr
      }
    })
    .filter((item): item is {
      notification_id: string
      target_type: string
      target_id: string
      target_title: string
      sent_total: number
      unique_clicks: number
      ctr_percent: number
    } => item !== null)

  const kpis = {
    unique_actualites_views: topActualites.reduce(
      (sum, item) => sum + item.unique_views,
      0
    ),
    unique_propositions_views: topPropositions.reduce(
      (sum, item) => sum + item.unique_views,
      0
    ),
    signalements_count: toNumber(signalementRows[0]?.total),
    unique_notification_clicks: uniqueNotificationClicksTotal,
    connected_users_count: connectedUsersCount
  }

  const response: StatsMobileResponse = {
    filters: {
      commune_id: communeId || null,
      period,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      mobile_only: true
    },
    kpis,
    top_actualites: topActualites,
    top_propositions: topPropositions,
    notifications_performance: notifications
  }

  setCachedStatsMobile(cacheKey, response)
  return response
})
