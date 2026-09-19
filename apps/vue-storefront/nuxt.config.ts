// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  devServer: { port: 8001 },
  modules: ["@nuxt/fonts"],
  css: [
    "@okkly/design-system/styles/index.scss",
    "@okkly/vue/style.css",
    "~/assets/css/global.scss",
  ],
  // The design system's tokens ask for Inter + JetBrains Mono by name
  // (--okkly-font-family-sans/-mono); @nuxt/fonts self-hosts both so there's
  // no render-blocking request to fonts.googleapis.com at runtime, same as
  // profile's next/font/google setup.
  fonts: {
    families: [
      {
        name: "Inter",
        provider: "google",
        weights: [400, 500, 600],
        subsets: ["latin", "latin-ext", "cyrillic"],
        global: true,
      },
      {
        name: "JetBrains Mono",
        provider: "google",
        weights: [400, 500],
        subsets: ["latin", "cyrillic"],
        global: true,
      },
    ],
  },
  imports: {
    // Auto-import composables/utils from the shared/ layer too, not just
    // the default composables/ and utils/ directories.
    dirs: [
      "shared/composables",
      "shared/configs",
      "shared/mutations",
      "shared/queries",
      "shared/utils",
    ],
  },
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_MEDUSA_BACKEND_URL / NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      medusaBackendUrl: "http://localhost:9000",
      medusaPublishableKey: "",
    },
  },
})
