import { createActionGroup, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';

export const ShippingOptionsActions = createActionGroup({
  source: 'Shipping Options',
  events: {
    /** Skips the request if options for this cart are already loaded. */
    Load: props<{ cartId: string }>(),
    /**
     * Refetches even for the same cart - shipping prices depend on the
     * cart's contents and address, which can change between visits to the
     * Delivery step.
     */
    Refresh: props<{ cartId: string }>(),
  },
});

export const ShippingOptionsApiActions = createActionGroup({
  source: 'Shipping Options API',
  events: {
    'Fetch Started': props<{ cartId: string }>(),
    'Fetch Succeeded': props<{
      shippingOptions: HttpTypes.StoreCartShippingOptionWithServiceZone[];
      cartId: string;
    }>(),
    'Fetch Failed': props<{ error: string }>(),
  },
});
