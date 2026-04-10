type PostHogCaptureProps = Record<string, unknown>

function normalizePostHogHost(host: string | undefined) {
  const fallback = 'https://eu.i.posthog.com'
  return (host || fallback).replace(/\/+$/, '')
}

export async function capturePosthogEvent(
  event: string,
  properties: PostHogCaptureProps = {},
) {
  const config = useRuntimeConfig()
  const apiKey = config.public.posthogApiKey || process.env.POSTHOG_API_KEY
  if (!apiKey) {
    return
  }

  const host = normalizePostHogHost(
    config.public.posthogHost || process.env.POSTHOG_HOST,
  )

  const payload = {
    api_key: apiKey,
    event,
    properties: {
      distinct_id: 'backoffice-server',
      app_context: 'server',
      ...properties,
    },
    timestamp: new Date().toISOString(),
  }

  try {
    await $fetch(`${host}/capture/`, {
      method: 'POST',
      body: payload,
    })
  } catch (error) {
    console.warn('[posthog] capture failed:', error)
  }
}

type HogQLResult = {
  columns?: string[]
  results?: unknown[][]
}

export async function queryPosthogHogQL(query: string) {
  const config = useRuntimeConfig()
  const personalApiKey
    = config.posthogPersonalApiKey || process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = config.posthogProjectId || process.env.POSTHOG_PROJECT_ID
  const host = normalizePostHogHost(
    config.public.posthogHost || process.env.POSTHOG_HOST,
  )

  if (!personalApiKey || !projectId) {
    throw createError({
      statusCode: 500,
      message:
        'PostHog query is not configured. Missing POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID.',
    })
  }

  let result: HogQLResult
  try {
    result = await $fetch<HogQLResult>(
      `${host}/api/projects/${projectId}/query/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${personalApiKey}`,
        },
        body: {
          query: {
            kind: 'HogQLQuery',
            query,
          },
        },
      },
    )
  } catch (error: any) {
    const detail = error?.data?.detail || error?.data?.message || error?.message
    console.error('[posthog] HogQL query failed:', detail)
    console.error(
      '[posthog] HogQL query snippet:',
      String(query).slice(0, 500),
    )
    throw error
  }

  const columns = result.columns || []
  const rows = result.results || []
  return rows.map((row) =>
    columns.reduce<Record<string, unknown>>((acc, col, index) => {
      acc[col] = row[index]
      return acc
    }, {}),
  )
}
