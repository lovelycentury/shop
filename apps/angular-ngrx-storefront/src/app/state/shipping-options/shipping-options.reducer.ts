import { createFeature, createReducer, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import { ShippingOptionsApiActions } from './shipping-options.actions';

export type ShippingOptionsState = {
  shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[];
  /** The cart the current `shippingOptions` were loaded for (set on success only). */
  cartId: string | null;
  loading: boolean;
  error: string | null;
};

export const initialShippingOptionsState: ShippingOptionsState = {
  shippingOptions: [],
  cartId: null,
  loading: false,
  error: null,
};

/**
 * The shipping options a cart can use, priced for that cart - ported from
 * the Vue storefront's `useShippingOptions`. Used by the checkout Delivery
 * step; the mutation that picks one (`CartActions.addShippingMethod`) lives
 * in the cart feature.
 */
export const shippingOptionsFeature = createFeature({
  name: 'shippingOptions',
  reducer: createReducer(
    initialShippingOptionsState,
    on(ShippingOptionsApiActions.fetchStarted, (state): ShippingOptionsState => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(
      ShippingOptionsApiActions.fetchSucceeded,
      (state, { shippingOptions, cartId }): ShippingOptionsState => ({
        ...state,
        shippingOptions,
        cartId,
        loading: false,
      }),
    ),
    on(ShippingOptionsApiActions.fetchFailed, (state, { error }): ShippingOptionsState => ({
      ...state,
      loading: false,
      error,
    })),
  ),
});
