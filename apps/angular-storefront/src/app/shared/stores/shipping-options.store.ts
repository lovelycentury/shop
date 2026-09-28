import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, from, pipe, switchMap, tap } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { injectMedusaSdk } from '../../core';

type ShippingOptionsState = {
  shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[];
  /** The cart the current `shippingOptions` were loaded for (set on success only). */
  cartId: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: ShippingOptionsState = {
  shippingOptions: [],
  cartId: null,
  loading: false,
  error: null,
};

/**
 * The shipping options a cart can use, priced for that cart — ported from
 * the Vue storefront's `useShippingOptions`. Used by the checkout Delivery
 * step; the mutation that picks one (`addShippingMethod`) lives in
 * `CartStore`.
 *
 * Only one request is ever in flight: both `load` and `refresh` are
 * ignored while `loading` is true.
 */
export const ShippingOptionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const sdk = injectMedusaSdk();

    const fetchShippingOptions = (cartId: string) =>
      from(sdk.store.fulfillment.listCartOptions({ cart_id: cartId })).pipe(
        tapResponse({
          next: ({ shipping_options }) =>
            patchState(store, { shippingOptions: shipping_options, cartId, loading: false }),
          error: (error: unknown) => patchState(store, { loading: false, error: String(error) }),
        }),
      );

    return {
      /** Skips the request if options for this cart are already loaded. */
      load: rxMethod<string>(
        pipe(
          filter((cartId) => !store.loading() && cartId !== store.cartId()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(fetchShippingOptions),
        ),
      ),

      /**
       * Refetches even for the same cart — shipping prices depend on the
       * cart's contents and address, which can change between visits to
       * the Delivery step.
       */
      refresh: rxMethod<string>(
        pipe(
          filter(() => !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(fetchShippingOptions),
        ),
      ),

      getAll(): HttpTypes.StoreCartShippingOptionWithServiceZone[] {
        return store.shippingOptions();
      },

      getById(id: string): HttpTypes.StoreCartShippingOptionWithServiceZone | undefined {
        return store.shippingOptions().find((option) => option.id === id);
      },
    };
  }),
);
