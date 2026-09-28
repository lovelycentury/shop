import { patchState, signalStore, withMethods, withState } from "@ngrx/signals"
import { rxMethod } from "@ngrx/signals/rxjs-interop"
import { tapResponse } from "@ngrx/operators"
import { filter, from, pipe, switchMap, tap } from "rxjs"
import type { HttpTypes } from "@medusajs/types"
import { injectMedusaSdk } from "../../core"

type CheckoutState = {
  shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[]
  shippingOptionsCartId: string | null
  shippingOptionsLoading: boolean
  paymentProviders: HttpTypes.StorePaymentProvider[]
  paymentProvidersRegionId: string | null
  paymentProvidersLoading: boolean
  error: string | null
}

const initialState: CheckoutState = {
  shippingOptions: [],
  shippingOptionsCartId: null,
  shippingOptionsLoading: false,
  paymentProviders: [],
  paymentProvidersRegionId: null,
  paymentProvidersLoading: false,
  error: null,
}

/**
 * Read-side data for the checkout steps, ported from the Vue storefront's
 * `useShippingOptions` and `usePaymentProviders`. Regions/countries come
 * from the shared `RegionsStore`. The checkout *mutations* (update cart,
 * add shipping method, create payment session, complete) live in
 * `CartStore` — they all act on the one active cart, so they share its
 * state instead of being duplicated here.
 *
 * Each resource has its own loading flag: the steps load them
 * independently (Delivery → Payment), so one step's request must never
 * make another step look busy.
 */
export const CheckoutStore = signalStore(
  { providedIn: "root" },
  withState(initialState),
  withMethods((store) => {
    const sdk = injectMedusaSdk()

    return {
      /**
       * Always refetches — shipping prices depend on the cart's contents
       * and address, which can change between visits to the Delivery step.
       * `switchMap` so a newer call (e.g. after an address change) cancels
       * a stale in-flight one.
       */
      loadShippingOptions: rxMethod<string>(
        pipe(
          tap((cartId) =>
            patchState(store, {
              shippingOptionsCartId: cartId,
              shippingOptionsLoading: true,
              error: null,
            })
          ),
          switchMap((cartId) =>
            from(
              sdk.store.fulfillment.listCartOptions({ cart_id: cartId })
            ).pipe(
              tapResponse({
                next: ({ shipping_options }) =>
                  patchState(store, {
                    shippingOptions: shipping_options,
                    shippingOptionsLoading: false,
                  }),
                error: (error: unknown) =>
                  patchState(store, {
                    shippingOptionsLoading: false,
                    error: String(error),
                  }),
              })
            )
          )
        )
      ),

      /** Providers only depend on the region, so the same region is not refetched. */
      loadPaymentProviders: rxMethod<string>(
        pipe(
          filter((regionId) => regionId !== store.paymentProvidersRegionId()),
          tap((regionId) =>
            patchState(store, {
              paymentProvidersRegionId: regionId,
              paymentProvidersLoading: true,
              error: null,
            })
          ),
          switchMap((regionId) =>
            from(
              sdk.store.payment.listPaymentProviders({ region_id: regionId })
            ).pipe(
              tapResponse({
                next: ({ payment_providers }) =>
                  patchState(store, {
                    paymentProviders: payment_providers,
                    paymentProvidersLoading: false,
                  }),
                error: (error: unknown) =>
                  patchState(store, {
                    paymentProvidersRegionId: null,
                    paymentProvidersLoading: false,
                    error: String(error),
                  }),
              })
            )
          )
        )
      ),
    }
  })
)
