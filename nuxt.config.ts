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
    public: {
      // SUPABASE_* ou NUXT_PUBLIC_SUPABASE_* (Koyeb peut n'injecter que NUXT_*)
      supabaseUrl: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
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
    '/_next/**': {
      index: false
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
