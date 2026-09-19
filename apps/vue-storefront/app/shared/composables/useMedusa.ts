import type Medusa from "@medusajs/js-sdk"

export const useMedusa = (): Medusa => useNuxtApp().$medusa as Medusa
