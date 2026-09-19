// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  devServer: { port: 8001 },
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_MEDUSA_BACKEND_URL / NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      medusaBackendUrl: "http://localhost:9000",
      medusaPublishableKey: "",
    },
  },
})
