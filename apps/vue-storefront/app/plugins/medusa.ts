import { createMedusaSdk } from "~/shared/configs/medusaSdkConfig"

export default defineNuxtPlugin(() => {
  return {
    provide: { medusa: createMedusaSdk() },
  }
})
