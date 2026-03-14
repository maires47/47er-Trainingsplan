// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
  ],

  supabase: {
    redirect: false, // Kein Auth-Redirect, wir nutzen kein Login-System
  },

  runtimeConfig: {
    adminPin: process.env.ADMIN_PIN,
    icalKm: process.env.ICAL_KM,
    icalReserve: process.env.ICAL_RESERVE,
    icalU15: process.env.ICAL_U15,
    icalU13: process.env.ICAL_U13,
    icalU11: process.env.ICAL_U11,
    icalU9: process.env.ICAL_U9,
    icalU7: process.env.ICAL_U7,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
    }
  },
})
