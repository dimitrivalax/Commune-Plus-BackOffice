import posthog from 'posthog-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const { canUseOptionalCookies } = useCookieConsent()

  const apiKey = config.public.posthogApiKey
  if (!apiKey) {
    return
  }

  const host = config.public.posthogHost || 'https://app.posthog.com'
  let initialized = false

  watch(
    canUseOptionalCookies,
    (isAllowed) => {
      if (isAllowed && !initialized) {
        posthog.init(apiKey, {
          api_host: host,
          persistence: 'localStorage+cookie',
          capture_pageview: true,
          capture_pageleave: true
        })
        initialized = true
        return
      }

      if (!isAllowed && initialized) {
        posthog.opt_out_capturing()
        posthog.reset(true)
      }
    },
    { immediate: true }
  )
})
