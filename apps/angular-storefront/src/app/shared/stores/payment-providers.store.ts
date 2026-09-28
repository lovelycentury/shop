import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, from, pipe, switchMap, tap } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { injectMedusaSdk } from '../../core';

type PaymentProvidersState = {
  paymentProviders: HttpTypes.StorePaymentProvider[];
  /** The region the current `paymentProviders` were loaded for (set on success only). */
  regionId: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: PaymentProvidersState = {
  paymentProviders: [],
  regionId: null,
  loading: false,
  error: null,
};

/**
 * The payment providers available in a region — ported from the Vue
 * storefront's `usePaymentProviders`. Used by the checkout Payment step;
 * the mutation that starts a session (`createPaymentSession`) lives in
 * `CartStore`.
 *
 * Only one request is ever in flight: both `load` and `refresh` are
 * ignored while `loading` is true.
 */
export const PaymentProvidersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const sdk = injectMedusaSdk();

    const fetchPaymentProviders = (regionId: string) =>
      from(sdk.store.payment.listPaymentProviders({ region_id: regionId })).pipe(
        tapResponse({
          next: ({ payment_providers }) =>
            patchState(store, { paymentProviders: payment_providers, regionId, loading: false }),
          error: (error: unknown) => patchState(store, { loading: false, error: String(error) }),
        }),
      );

    return {
      /** Providers only depend on the region, so an already-loaded region is skipped. */
      load: rxMethod<string>(
        pipe(
          filter((regionId) => !store.loading() && regionId !== store.regionId()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(fetchPaymentProviders),
        ),
      ),

      /** Refetches even for an already-loaded region. */
      refresh: rxMethod<string>(
        pipe(
          filter(() => !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(fetchPaymentProviders),
        ),
      ),

      getAll(): HttpTypes.StorePaymentProvider[] {
        return store.paymentProviders();
      },

      getById(id: string): HttpTypes.StorePaymentProvider | undefined {
        return store.paymentProviders().find((provider) => provider.id === id);
      },
    };
  }),
);
