import {
  requireAuth,
  requireCurrentUserProfile,
} from '../../utils/firebase-auth'
import { queryPosthogHogQL } from '../../utils/posthog-server'
import { getAdminFirestore } from '../../utils/firebase-admin-app'

type StatsRow = Record<string, unknown>

function toSqlString(value: string) {
  return `'${value.replace(/'/g, "\\'")}'`
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

async function loadTitles(collectionName: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const db = getAdminFirestore()
  const refs = ids.map((id) => db.collection(collectionName).doc(id))
  const snaps = await db.getAll(...refs)
  const map = new Map<string, string>()
  for (const snap of snaps) {
    if (!snap.exists) continue
    const data = snap.data() || {}
    const title = String(
      (data.title as string | undefined)
      || (data.name as string | undefined)
      || snap.id,
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

  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(now.getDate() - (period === '7d' ? 7 : 30))

  const startDate = parseDateInput(
    typeof query.start === 'string' ? query.start : undefined,
  ) || defaultStart
  const endDate = parseDateInput(
    typeof query.end === 'string' ? query.end : undefined,
  ) || now

  const isGlobalAdmin = profile.role === 'administrateur'
  const allowedCommuneIds = profile.communeIds || []
  const communeId = requestedCommuneId || (isGlobalAdmin ? '' : allowedCommuneIds[0] || '')

  if (!isGlobalAdmin && communeId && !allowedCommuneIds.includes(communeId)) {
    throw createError({
      statusCode: 403,
      message: "Vous n'avez pas la permission d'acceder a cette commune",
    })
  }

  const mobileFilter = "coalesce(properties.platform, '') IN ('ios','android')"
  const timeFilter = `timestamp >= toDateTime(${toSqlString(isoDateTime(startDate))}) AND timestamp <= toDateTime(${toSqlString(isoDateTime(endDate))})`
  const communeFilter = communeId
    ? `AND properties.commune_id = ${toSqlString(communeId)}`
    : ''

  const topActualitesRows = await queryPosthogHogQL(`
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
  `)

  const topPropositionsRows = await queryPosthogHogQL(`
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
  `)

  const signalementRows = await queryPosthogHogQL(`
    SELECT count(*) AS total
    FROM events
    WHERE event = 'signalement_submitted'
      AND ${timeFilter}
      AND ${mobileFilter}
      ${communeFilter}
  `)

  let notificationsRows: StatsRow[] = []
  let uniqueNotificationClicksTotal = 0
  try {
    notificationsRows = await queryPosthogHogQL(`
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
    `)

    const uniqueNotificationClicksRows = await queryPosthogHogQL(`
      SELECT count(DISTINCT distinct_id) AS total
      FROM events
      WHERE event = 'notification_clicked'
        AND ${timeFilter}
        AND ${mobileFilter}
        ${communeFilter}
    `)
    uniqueNotificationClicksTotal = toNumber(uniqueNotificationClicksRows[0]?.total)
  } catch (error) {
    console.warn('[stats-mobile] notifications_performance fallback to empty:', error)
    notificationsRows = []
    uniqueNotificationClicksTotal = 0
  }

  const actualiteIds = topActualitesRows
    .map((row) => String(row.actualite_id || ''))
    .filter(Boolean)
  const propositionIds = topPropositionsRows
    .map((row) => String(row.proposition_id || ''))
    .filter(Boolean)
  const notificationActualiteIds = notificationsRows
    .filter((row) => String(row.target_type || '') === 'actualite')
    .map((row) => String(row.target_id || ''))
    .filter(Boolean)
  const notificationPropositionIds = notificationsRows
    .filter((row) => String(row.target_type || '') === 'proposition')
    .map((row) => String(row.target_id || ''))
    .filter(Boolean)

  const [actualiteTitles, propositionTitles] = await Promise.all([
    loadTitles('actualite', [...new Set([...actualiteIds, ...notificationActualiteIds])]),
    loadTitles('proposition', [...new Set([...propositionIds, ...notificationPropositionIds])]),
  ])

  const topActualites = topActualitesRows
    .map((row: StatsRow) => {
      const id = String(row.actualite_id || '')
      const title = actualiteTitles.get(id)
      if (!title) return null
      return {
        id,
        title,
        unique_views: toNumber(row.unique_views),
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
        unique_views: toNumber(row.unique_views),
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
        ctr_percent: ctr,
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
      0,
    ),
    unique_propositions_views: topPropositions.reduce(
      (sum, item) => sum + item.unique_views,
      0,
    ),
    signalements_count: toNumber(signalementRows[0]?.total),
    unique_notification_clicks: uniqueNotificationClicksTotal,
  }

  return {
    filters: {
      commune_id: communeId || null,
      period,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      mobile_only: true,
    },
    kpis,
    top_actualites: topActualites,
    top_propositions: topPropositions,
    notifications_performance: notifications,
  }
})
