import { createFeature, createReducer, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import { PaymentProvidersApiActions } from './payment-providers.actions';

export type PaymentProvidersState = {
  paymentProviders: HttpTypes.StorePaymentProvider[];
  /** The region the current `paymentProviders` were loaded for (set on success only). */
  regionId: string | null;
  loading: boolean;
  error: string | null;
};

export const initialPaymentProvidersState: PaymentProvidersState = {
  paymentProviders: [],
  regionId: null,
  loading: false,
  error: null,
};

/**
 * The payment providers available in a region - ported from the Vue
 * storefront's `usePaymentProviders`. Used by the checkout Payment step; the
 * mutation that starts a session (`CartActions.createPaymentSession`) lives
 * in the cart feature.
 */
export const paymentProvidersFeature = createFeature({
  name: 'paymentProviders',
  reducer: createReducer(
    initialPaymentProvidersState,
    on(PaymentProvidersApiActions.fetchStarted, (state): PaymentProvidersState => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(
      PaymentProvidersApiActions.fetchSucceeded,
      (state, { paymentProviders, regionId }): PaymentProvidersState => ({
        ...state,
        paymentProviders,
        regionId,
        loading: false,
      }),
    ),
    on(PaymentProvidersApiActions.fetchFailed, (state, { error }): PaymentProvidersState => ({
      ...state,
      loading: false,
      error,
    })),
  ),
});
