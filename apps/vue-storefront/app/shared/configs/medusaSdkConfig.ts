import Medusa, {
  type ClientHeaders,
  type FetchArgs,
  type FetchInput,
} from "@medusajs/js-sdk"

const LOCALE_COOKIE_NAME = "_medusa_locale"
const LOCALE_HEADER_NAME = "x-medusa-locale"

/**
 * The storefront's locale preference, persisted in a cookie so it survives
 * navigation and is already known on the very first SSR render.
 *
 * `useCookie` is isomorphic: during SSR it reads/writes the request's
 * `Cookie`/`Set-Cookie` headers, in the browser it reads/writes
 * `document.cookie` - one code path covers both, unlike Next's `cookies()`
 * (server-only) + a separate client story. Nuxt also caches the returned
 * ref per cookie name on the current Nuxt app, so every call site - this
 * file, a language switcher, etc. - shares the same ref: updating it
 * anywhere is visible everywhere, including inside the fetch override below.
 */
export const useMedusaLocale = () =>
  useCookie<string | null>(LOCALE_COOKIE_NAME, {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "strict",
  })

/**
 * Builds a Medusa SDK instance that stamps every request with the current
 * locale, read fresh on each call so a later locale change is picked up
 * without recreating the SDK.
 *
 * Must be called inside a Nuxt context (a plugin, component setup, or route
 * middleware) - it uses `useRuntimeConfig`/`useCookie`, which only resolve
 * the current request (server) or app instance (client) from there.
 */
export const createMedusaSdk = () => {
  const { medusaBackendUrl, medusaPublishableKey } = useRuntimeConfig().public
  const locale = useMedusaLocale()

  const sdk = new Medusa({
    baseUrl: medusaBackendUrl,
    publishableKey: medusaPublishableKey,
    debug: import.meta.dev,
  })

  const originalFetch = sdk.client.fetch.bind(sdk.client)

  sdk.client.fetch = (<T>(
    input: FetchInput,
    init?: FetchArgs
  ): Promise<T> => {
    const headers: ClientHeaders = { ...init?.headers }
    headers[LOCALE_HEADER_NAME] ??= locale.value

    return originalFetch(input, { ...init, headers })
  }) as typeof sdk.client.fetch

  return sdk
}
