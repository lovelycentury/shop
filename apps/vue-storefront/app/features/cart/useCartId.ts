/**
 * The current visitor's cart id, persisted client- and server-side in a
 * cookie so it survives reloads and is available on the very first render
 * (no flash from "no cart" to "cart restored").
 */
export const useCartId = () =>
  useCookie<string | null>("cart_id", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  })
