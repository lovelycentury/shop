import Medusa from "@medusajs/js-sdk"

export default defineNuxtPlugin(() => {
  const { medusaBackendUrl, medusaPublishableKey } = useRuntimeConfig().public

  const medusa = new Medusa({
    baseUrl: medusaBackendUrl,
    publishableKey: medusaPublishableKey,
    debug: import.meta.dev,
  })

  return {
    provide: { medusa },
  }
})
