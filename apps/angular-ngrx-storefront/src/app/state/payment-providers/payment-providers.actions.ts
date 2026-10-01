import { createActionGroup, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';

export const PaymentProvidersActions = createActionGroup({
  source: 'Payment Providers',
  events: {
    /** Providers only depend on the region, so an already-loaded region is skipped. */
    Load: props<{ regionId: string }>(),
    /** Refetches even for an already-loaded region. */
    Refresh: props<{ regionId: string }>(),
  },
});

export const PaymentProvidersApiActions = createActionGroup({
  source: 'Payment Providers API',
  events: {
    'Fetch Started': props<{ regionId: string }>(),
    'Fetch Succeeded': props<{
      paymentProviders: HttpTypes.StorePaymentProvider[];
      regionId: string;
    }>(),
    'Fetch Failed': props<{ error: string }>(),
  },
});
