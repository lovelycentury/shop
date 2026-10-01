import { createActionGroup, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';

export const OrdersActions = createActionGroup({
  source: 'Orders',
  events: {
    /** Skips the request if the order is cached or already in flight. */
    'Load By Id': props<{ id: string }>(),
  },
});

export const OrdersApiActions = createActionGroup({
  source: 'Orders API',
  events: {
    'Fetch Started': props<{ id: string }>(),
    'Fetch Succeeded': props<{ order: HttpTypes.StoreOrder }>(),
    'Fetch Failed': props<{ id: string; error: string }>(),
  },
});
