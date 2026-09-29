import { computed, inject } from "@angular/core"
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from "@ngrx/signals"
import { rxMethod } from "@ngrx/signals/rxjs-interop"
import { tapResponse } from "@ngrx/operators"
import { filter, from, mergeMap, pipe, switchMap, tap } from "rxjs"
import type { HttpTypes } from "@medusajs/types"
import { CartIdService, injectMedusaSdk } from "../../core"

type CartState = {
  cart: HttpTypes.StoreCart | null
  loading: boolean
  error: string | null
  pendingLineItemIds: string[]
}

const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
  pendingLineItemIds: [],
}

/** The outcome of a cart-level mutation; `error` is user-facing. */
export type CartMutationResult = { ok: true } | { ok: false; error: string }

export type CompleteCartResult =
  | { kind: "order"; order: HttpTypes.StoreOrder }
  /** Medusa refused to place the order (e.g. payment not authorized). */
  | { kind: "rejected"; message: string }
  /** The request itself failed, or couldn't be made. */
  | { kind: "failed"; message: string }

const NO_CART = "There is no cart to update."
const CART_BUSY = "The cart is still being updated — try again in a moment."

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/**
 * Everything else (items, addresses, shipping methods) comes back by
 * default — the payment collection's sessions are the one relation the
 * checkout steps need that isn't.
 */
const CART_FIELDS = "*payment_collection.payment_sessions"

/** `addItem` has no line item id yet, so its pending marker is keyed by variant. */
const addPendingKey = (variantId: string) => `add:${variantId}`

const removePendingLineItemId = (id: string) => (state: CartState) => ({
  pendingLineItemIds: state.pendingLineItemIds.filter(
    (pendingId) => pendingId !== id
  ),
})

/**
 * Singleton cart store (`providedIn: 'root'`) — the whole app shares one
 * active cart, identified by the `cart_id` cookie (`CartIdService`). The
 * cart is created lazily on the first `addItem`, not on every page load —
 * a browsing session that never buys anything should never create one.
 * Ported from the Vue storefront's `shared/mutations` + `shared/queries`.
 *
 * Cart-level mutations (`updateCart`, `addShippingMethod`,
 * `createPaymentSession`, `complete`) share the `loading` flag — there's
 * only ever one active cart, so only one of these makes sense at a time.
 * They're plain async rather than `rxMethod`: each is one checkout step's
 * submit, and the step has to `await` the outcome before moving on.
 * Line-item mutations (`updateLineItem`, `removeLineItem`, `addItem`) are
 * keyed in `pendingLineItemIds`, so acting on one item never blocks
 * another.
 */
export const CartStore = signalStore(
  { providedIn: "root" },
  withState(initialState),
  withComputed(({ cart }) => ({
    itemCount: computed(() =>
      (cart()?.items ?? []).reduce((total, item) => total + item.quantity, 0)
    ),
  })),
  withMethods((store) => {
    const sdk = injectMedusaSdk()
    const cartIdService = inject(CartIdService)

    const fetchCart = (cartId: string) =>
      from(sdk.store.cart.retrieve(cartId, { fields: CART_FIELDS })).pipe(
        tapResponse({
          next: ({ cart }) => patchState(store, { cart, loading: false }),
          error: (error: unknown) =>
            patchState(store, { loading: false, error: String(error) }),
        })
      )

    /** Runs one cart-level mutation that resolves to the updated cart. */
    const mutateCart = async (
      request: (cart: HttpTypes.StoreCart) => Promise<HttpTypes.StoreCart>
    ): Promise<CartMutationResult> => {
      const cart = store.cart()
      if (!cart) return { ok: false, error: NO_CART }
      if (store.loading()) return { ok: false, error: CART_BUSY }

      patchState(store, { loading: true, error: null })

      try {
        patchState(store, { cart: await request(cart), loading: false })
        return { ok: true }
      } catch (error) {
        const message = errorMessage(error)
        patchState(store, { loading: false, error: message })
        return { ok: false, error: message }
      }
    }

    return {
      load: rxMethod<void>(
        pipe(
          filter(
            () =>
              cartIdService.cartId() !== null &&
              !store.loading() &&
              !store.cart()
          ),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() => fetchCart(cartIdService.cartId() as string))
        )
      ),

      /** Like `load`, but refetches even if the cart is already in state. */
      refresh: rxMethod<void>(
        pipe(
          filter(() => cartIdService.cartId() !== null && !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() => fetchCart(cartIdService.cartId() as string))
        )
      ),

      /**
       * Creates the cart on first use, then adds the line item. Plain
       * async, not `rxMethod` — the caller (an "Add to cart" button) needs
       * to `await` the outcome directly, e.g. to show a toast on error.
       * Keyed by variant id in `pendingLineItemIds` so double-clicking
       * "add" for the same variant doesn't fire twice.
       */
      async addItem(params: {
        variantId: string
        quantity: number
        regionId: string
      }): Promise<void> {
        const pendingKey = addPendingKey(params.variantId)
        if (store.pendingLineItemIds().includes(pendingKey)) {
          return
        }

        patchState(store, (s) => ({
          pendingLineItemIds: [...s.pendingLineItemIds, pendingKey],
          error: null,
        }))

        try {
          let cartId = cartIdService.cartId()

          if (!cartId) {
            const { cart } = await sdk.store.cart.create({
              region_id: params.regionId,
            })
            cartId = cart.id
            cartIdService.set(cartId)
          }

          const { cart } = await sdk.store.cart.createLineItem(cartId, {
            variant_id: params.variantId,
            quantity: params.quantity,
          })

          patchState(store, { cart })
        } catch (error) {
          patchState(store, { error: String(error) })
        } finally {
          patchState(store, removePendingLineItemId(pendingKey))
        }
      },

      updateLineItem: rxMethod<{
        lineItemId: string
        body: HttpTypes.StoreUpdateCartLineItem
      }>(
        pipe(
          filter(
            ({ lineItemId }) =>
              !!store.cart() && !store.pendingLineItemIds().includes(lineItemId)
          ),
          tap(({ lineItemId }) =>
            patchState(store, (s) => ({
              pendingLineItemIds: [...s.pendingLineItemIds, lineItemId],
            }))
          ),
          mergeMap(({ lineItemId, body }) =>
            from(
              sdk.store.cart.updateLineItem(store.cart()!.id, lineItemId, body)
            ).pipe(
              tapResponse({
                next: ({ cart }) =>
                  patchState(
                    store,
                    { cart },
                    removePendingLineItemId(lineItemId)
                  ),
                error: (error: unknown) =>
                  patchState(
                    store,
                    { error: String(error) },
                    removePendingLineItemId(lineItemId)
                  ),
              })
            )
          )
        )
      ),

      removeLineItem: rxMethod<string>(
        pipe(
          filter(
            (lineItemId) =>
              !!store.cart() && !store.pendingLineItemIds().includes(lineItemId)
          ),
          tap((lineItemId) =>
            patchState(store, (s) => ({
              pendingLineItemIds: [...s.pendingLineItemIds, lineItemId],
            }))
          ),
          mergeMap((lineItemId) =>
            from(
              sdk.store.cart.deleteLineItem(store.cart()!.id, lineItemId)
            ).pipe(
              tapResponse({
                next: ({ parent }) =>
                  patchState(
                    store,
                    { cart: parent ?? store.cart() },
                    removePendingLineItemId(lineItemId)
                  ),
                error: (error: unknown) =>
                  patchState(
                    store,
                    { error: String(error) },
                    removePendingLineItemId(lineItemId)
                  ),
              })
            )
          )
        )
      ),

      updateCart(body: HttpTypes.StoreUpdateCart): Promise<CartMutationResult> {
        return mutateCart(async (cart) => {
          const response = await sdk.store.cart.update(cart.id, body, {
            fields: CART_FIELDS,
          })
          return response.cart
        })
      },

      addShippingMethod(
        body: HttpTypes.StoreAddCartShippingMethods
      ): Promise<CartMutationResult> {
        return mutateCart(async (cart) => {
          const response = await sdk.store.cart.addShippingMethod(
            cart.id,
            body,
            { fields: CART_FIELDS }
          )
          return response.cart
        })
      },

      /**
       * The response is the payment collection, not the cart — so the cart
       * is refetched to pick up the new session the Review step checks for.
       */
      createPaymentSession(
        body: HttpTypes.StoreInitializePaymentSession
      ): Promise<CartMutationResult> {
        return mutateCart(async (cart) => {
          await sdk.store.payment.initiatePaymentSession(cart, body)
          const response = await sdk.store.cart.retrieve(cart.id, {
            fields: CART_FIELDS,
          })
          return response.cart
        })
      },

      /**
       * Places the order. On success the cart is spent: it's dropped from
       * state and the `cart_id` cookie is cleared, so the next purchase
       * starts a fresh cart.
       */
      async complete(): Promise<CompleteCartResult> {
        const cart = store.cart()
        if (!cart) return { kind: "failed", message: NO_CART }
        if (store.loading()) return { kind: "failed", message: CART_BUSY }

        patchState(store, { loading: true, error: null })

        try {
          const response = await sdk.store.cart.complete(cart.id)

          if (response.type === "order") {
            patchState(store, { cart: null, loading: false })
            cartIdService.clear()
            return { kind: "order", order: response.order }
          }

          patchState(store, {
            cart: response.cart,
            loading: false,
            error: response.error.message,
          })
          return { kind: "rejected", message: response.error.message }
        } catch (error) {
          const message = errorMessage(error)
          patchState(store, { loading: false, error: message })
          return { kind: "failed", message }
        }
      },

      getCart(): HttpTypes.StoreCart | null {
        return store.cart()
      },

      /** Whether an `addItem` for this variant is still in flight. */
      isAdding(variantId: string): boolean {
        return store.pendingLineItemIds().includes(addPendingKey(variantId))
      },
    }
  })
)
