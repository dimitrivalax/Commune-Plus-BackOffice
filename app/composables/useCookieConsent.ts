type CookieConsentChoice = 'accepted' | 'refused'

const COOKIE_CONSENT_KEY = 'cookie-consent'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

export function useCookieConsent() {
  const consentCookie = useCookie<CookieConsentChoice | undefined>(
    COOKIE_CONSENT_KEY,
    {
      maxAge: COOKIE_MAX_AGE_SECONDS,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    }
  )

  const status = computed<'pending' | CookieConsentChoice>(() =>
    consentCookie.value ?? 'pending'
  )

  const hasDecided = computed(() => status.value !== 'pending')
  const canUseOptionalCookies = computed(() => status.value === 'accepted')

  function accept() {
    consentCookie.value = 'accepted'
  }

  function refuse() {
    consentCookie.value = 'refused'
  }

  function reset() {
    consentCookie.value = undefined
  }

  return {
    status,
    hasDecided,
    canUseOptionalCookies,
    accept,
    refuse,
    reset
  }
}
