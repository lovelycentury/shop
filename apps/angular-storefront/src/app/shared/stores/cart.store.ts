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
  completedOrder: HttpTypes.StoreOrder | null
}

const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
  pendingLineItemIds: [],
  completedOrder: null,
}

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
      from(
        sdk.store.cart.retrieve(cartId, {
          // Everything else (items, addresses, shipping methods) comes back
          // by default — the payment collection's sessions are the one
          // relation the checkout steps need that isn't.
          fields: "*payment_collection.payment_sessions",
        })
      ).pipe(
        tapResponse({
          next: ({ cart }) => patchState(store, { cart, loading: false }),
          error: (error: unknown) =>
            patchState(store, { loading: false, error: String(error) }),
        })
      )

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

      updateCart: rxMethod<HttpTypes.StoreUpdateCart>(
        pipe(
          filter(() => !!store.cart() && !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((body) =>
            from(sdk.store.cart.update(store.cart()!.id, body)).pipe(
              tapResponse({
                next: ({ cart }) => patchState(store, { cart, loading: false }),
                error: (error: unknown) =>
                  patchState(store, { loading: false, error: String(error) }),
              })
            )
          )
        )
      ),

      addShippingMethod: rxMethod<HttpTypes.StoreAddCartShippingMethods>(
        pipe(
          filter(() => !!store.cart() && !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((body) =>
            from(sdk.store.cart.addShippingMethod(store.cart()!.id, body)).pipe(
              tapResponse({
                next: ({ cart }) => patchState(store, { cart, loading: false }),
                error: (error: unknown) =>
                  patchState(store, { loading: false, error: String(error) }),
              })
            )
          )
        )
      ),

      /**
       * The response doesn't include the cart (just the payment
       * collection), so on success we refetch it — that's the only reason
       * `fetchCart` runs here instead of a plain `patchState`.
       */
      createPaymentSession: rxMethod<HttpTypes.StoreInitializePaymentSession>(
        pipe(
          filter(() => !!store.cart() && !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap((body) => {
            const cart = store.cart()!

            return from(
              sdk.store.payment.initiatePaymentSession(cart, body)
            ).pipe(
              tapResponse({
                next: () => {},
                error: (error: unknown) =>
                  patchState(store, { loading: false, error: String(error) }),
              }),
              switchMap(() => fetchCart(cart.id))
            )
          })
        )
      ),

      complete: rxMethod<void>(
        pipe(
          filter(() => !!store.cart() && !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            from(sdk.store.cart.complete(store.cart()!.id)).pipe(
              tapResponse({
                next: (response) => {
                  if (response.type === "order") {
                    patchState(store, {
                      loading: false,
                      completedOrder: response.order,
                      cart: null,
                    })
                    cartIdService.clear()
                  } else {
                    patchState(store, {
                      loading: false,
                      error: response.error.message,
                      cart: response.cart,
                    })
                  }
                },
                error: (error: unknown) =>
                  patchState(store, { loading: false, error: String(error) }),
              })
            )
          )
        )
      ),

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
