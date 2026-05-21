// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@nuxtjs/leaflet'],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Ignorer les chemins webpack-hmr dans le routeur
  router: {
    options: {
      strict: false
    }
  },

  runtimeConfig: {
    posthogProjectId: process.env.POSTHOG_PROJECT_ID || '',
    posthogPersonalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
    facebookAppId: process.env.FACEBOOK_APP_ID || '',
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',
    facebookOauthCallbackUrl: process.env.FACEBOOK_OAUTH_CALLBACK_URL || '',
    facebookOauthStateSecret: process.env.FACEBOOK_OAUTH_STATE_SECRET || '',
    facebookTokenEncryptionKey: process.env.FACEBOOK_TOKEN_ENCRYPTION_KEY || '',
    facebookGraphApiVersion: process.env.FACEBOOK_GRAPH_API_VERSION || 'v25.0',
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
      posthogApiKey: process.env.POSTHOG_API_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || 'https://app.posthog.com'
    }
  },

  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    },
    // Pages publiques : SSR ok. Le reste en client-only évite d’envoyer le HTML du backoffice
    // (ex. « Bienvenue ») avant que le middleware auth client n’ait redirigé vers /login.
    '/login': { ssr: true },
    '/signup': { ssr: true },
    '/**': { ssr: false }
  },

  compatibilityDate: '2024-07-11',

  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
