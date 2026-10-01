import { type EntityState, createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import { OrdersApiActions } from './orders.actions';

export type OrdersState = EntityState<HttpTypes.StoreOrder> & {
  error: string | null;
  pendingIds: string[];
};

const adapter = createEntityAdapter<HttpTypes.StoreOrder>();

export const initialOrdersState: OrdersState = adapter.getInitialState({
  error: null,
  pendingIds: [],
});

const withoutPendingId = (state: OrdersState, id: string): string[] =>
  state.pendingIds.filter((pendingId) => pendingId !== id);

/**
 * Orders by id, ported from the Vue storefront's `useOrder`. The Store API
 * allows retrieving a single order without authentication (unlike listing
 * orders), which is what lets a guest checkout land on an order
 * status/confirmation page.
 */
export const ordersFeature = createFeature({
  name: 'orders',
  reducer: createReducer(
    initialOrdersState,
    on(OrdersApiActions.fetchStarted, (state, { id }): OrdersState => ({
      ...state,
      pendingIds: [...state.pendingIds, id],
      error: null,
    })),
    on(OrdersApiActions.fetchSucceeded, (state, { order }): OrdersState =>
      adapter.upsertOne(order, { ...state, pendingIds: withoutPendingId(state, order.id) }),
    ),
    on(OrdersApiActions.fetchFailed, (state, { id, error }): OrdersState => ({
      ...state,
      error,
      pendingIds: withoutPendingId(state, id),
    })),
  ),
  extraSelectors: ({ selectOrdersState }) => adapter.getSelectors(selectOrdersState),
});
