import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import { CartApiActions } from './cart.actions';

export type CartState = {
  cart: HttpTypes.StoreCart | null;
  loading: boolean;
  error: string | null;
  pendingLineItemIds: string[];
};

export const initialCartState: CartState = {
  cart: null,
  loading: false,
  error: null,
  pendingLineItemIds: [],
};

const withoutPendingId = (state: CartState, id: string): string[] =>
  state.pendingLineItemIds.filter((pendingId) => pendingId !== id);

/**
 * The whole app shares one active cart, identified by the `cart_id` cookie
 * (`CartIdService`). The cart is created lazily on the first `addItem`, not
 * on every page load - a browsing session that never buys anything should
 * never create one. Ported from the Vue storefront's `shared/mutations` +
 * `shared/queries`.
 *
 * Cart-level mutations share the `loading` flag - there's only ever one
 * active cart, so only one of these makes sense at a time. Line-item
 * mutations are keyed in `pendingLineItemIds`, so acting on one item never
 * blocks another.
 */
export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(
    initialCartState,

    on(CartApiActions.fetchStarted, (state): CartState => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(CartApiActions.fetchSucceeded, (state, { cart }): CartState => ({
      ...state,
      cart,
      loading: false,
    })),
    on(CartApiActions.fetchFailed, (state, { error }): CartState => ({
      ...state,
      loading: false,
      error,
    })),

    on(CartApiActions.addItemStarted, (state, { pendingKey }): CartState => ({
      ...state,
      pendingLineItemIds: [...state.pendingLineItemIds, pendingKey],
      error: null,
    })),
    on(CartApiActions.addItemSucceeded, (state, { pendingKey, cart }): CartState => ({
      ...state,
      cart,
      pendingLineItemIds: withoutPendingId(state, pendingKey),
    })),
    on(CartApiActions.addItemFailed, (state, { pendingKey, error }): CartState => ({
      ...state,
      error,
      pendingLineItemIds: withoutPendingId(state, pendingKey),
    })),

    on(CartApiActions.lineItemStarted, (state, { lineItemId }): CartState => ({
      ...state,
      pendingLineItemIds: [...state.pendingLineItemIds, lineItemId],
    })),
    on(CartApiActions.lineItemSucceeded, (state, { lineItemId, cart }): CartState => ({
      ...state,
      cart: cart ?? state.cart,
      pendingLineItemIds: withoutPendingId(state, lineItemId),
    })),
    on(CartApiActions.lineItemFailed, (state, { lineItemId, error }): CartState => ({
      ...state,
      error,
      pendingLineItemIds: withoutPendingId(state, lineItemId),
    })),

    on(CartApiActions.mutationStarted, (state): CartState => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(CartApiActions.mutationSucceeded, (state, { cart }): CartState => ({
      ...state,
      cart,
      loading: false,
    })),
    on(CartApiActions.mutationFailed, (state, { error }): CartState => ({
      ...state,
      loading: false,
      error,
    })),

    on(CartApiActions.orderPlaced, (state): CartState => ({
      ...state,
      cart: null,
      loading: false,
    })),
    on(CartApiActions.orderRejected, (state, { cart, message }): CartState => ({
      ...state,
      cart,
      loading: false,
      error: message,
    })),
  ),
  extraSelectors: ({ selectCart }) => ({
    selectItemCount: createSelector(selectCart, (cart) =>
      (cart?.items ?? []).reduce((total, item) => total + item.quantity, 0),
    ),
  }),
});
