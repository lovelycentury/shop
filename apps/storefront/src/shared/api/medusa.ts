/**
 * Thin Medusa SDK wrappers for the flows the storefront needs most often:
 * listing/retrieving products, driving a cart, and creating a payment
 * session for it. Each function is a direct pass-through to `sdk.store.*`
 * (see the `building-storefronts` skill: always go through the SDK, never
 * a bare `fetch()`), so it carries no cookie/cache/redirect concerns of its
 * own - callers (e.g. the server actions in `@lib/data`) own those.
 */
import { sdk } from "@lib/config"
import type { ClientHeaders } from "@medusajs/js-sdk"
import { HttpTypes, SelectParams } from "@medusajs/types"

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Fetches all products matching the given filters (paginated via
 * `limit`/`offset` in `query`).
 */
export const fetchProducts = (
  query?: HttpTypes.StoreProductListParams,
  headers?: ClientHeaders
) => sdk.store.product.list(query, headers)

/**
 * Fetches a single product by its ID.
 */
export const fetchProductById = (
  id: string,
  query?: HttpTypes.StoreProductParams,
  headers?: ClientHeaders
) => sdk.store.product.retrieve(id, query, headers)

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/** Creates a new cart. */
export const createCart = (
  body: HttpTypes.StoreCreateCart,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.create(body, query, headers)

/** Fetches a cart by its ID. */
export const fetchCart = (
  id: string,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.retrieve(id, query, headers)

/** Updates a cart (region, addresses, email, promo codes, ...). */
export const updateCart = (
  id: string,
  body: HttpTypes.StoreUpdateCart,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.update(id, body, query, headers)

/** Adds a line item (variant + quantity) to a cart. */
export const addCartLineItem = (
  cartId: string,
  body: HttpTypes.StoreAddCartLineItem,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.createLineItem(cartId, body, query, headers)

/** Updates a line item's quantity on a cart. */
export const updateCartLineItem = (
  cartId: string,
  lineItemId: string,
  body: HttpTypes.StoreUpdateCartLineItem,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.updateLineItem(cartId, lineItemId, body, query, headers)

/** Removes a line item from a cart. */
export const deleteCartLineItem = (
  cartId: string,
  lineItemId: string,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.deleteLineItem(cartId, lineItemId, query, headers)

/** Completes a cart, turning it into an order. */
export const completeCart = (
  cartId: string,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.cart.complete(cartId, query, headers)

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

/** Lists the payment providers available for a region. */
export const fetchPaymentProviders = (
  query: HttpTypes.FindParams & HttpTypes.StorePaymentProviderFilters,
  headers?: ClientHeaders
) => sdk.store.payment.listPaymentProviders(query, headers)

/**
 * Creates a payment session for a cart with the chosen provider (creating
 * the cart's payment collection first if it doesn't have one yet).
 */
export const createPaymentSession = (
  cart: HttpTypes.StoreCart,
  body: HttpTypes.StoreInitializePaymentSession,
  query?: SelectParams,
  headers?: ClientHeaders
) => sdk.store.payment.initiatePaymentSession(cart, body, query, headers)
