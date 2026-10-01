import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';

/** What the UI asks for. Whether a request actually goes out is `CartEffects`' call. */
export const CartActions = createActionGroup({
  source: 'Cart',
  events: {
    /** Skipped for a visitor with no cart id, once the cart is loaded, or while it loads. */
    Load: emptyProps(),
    /** Like `load`, but refetches even if the cart is already in state. */
    Refresh: emptyProps(),
    /**
     * Creates the cart on first use, then adds the line item. Dropped while
     * an add for the same variant is in flight, so double-clicking "add"
     * doesn't fire twice.
     */
    'Add Item': props<{ variantId: string; quantity: number; regionId: string }>(),
    /** Dropped while another update/remove for the same line is in flight. */
    'Update Line Item': props<{ lineItemId: string; body: HttpTypes.StoreUpdateCartLineItem }>(),
    'Remove Line Item': props<{ lineItemId: string }>(),
    // Cart-level mutations - one checkout step's submit each. The step
    // awaits the outcome (`CART_MUTATION_RESULTS`) before moving on.
    'Update Cart': props<{ body: HttpTypes.StoreUpdateCart }>(),
    'Add Shipping Method': props<{ body: HttpTypes.StoreAddCartShippingMethods }>(),
    'Create Payment Session': props<{ body: HttpTypes.StoreInitializePaymentSession }>(),
    /** Places the order (`CART_COMPLETE_RESULTS`). */
    Complete: emptyProps(),
  },
});

/** What actually happened - only `CartEffects` dispatches these. */
export const CartApiActions = createActionGroup({
  source: 'Cart API',
  events: {
    'Fetch Started': emptyProps(),
    'Fetch Succeeded': props<{ cart: HttpTypes.StoreCart }>(),
    'Fetch Failed': props<{ error: string }>(),

    /** `addItem` has no line item id yet, so its pending marker is keyed by variant. */
    'Add Item Started': props<{ pendingKey: string }>(),
    'Add Item Succeeded': props<{ pendingKey: string; cart: HttpTypes.StoreCart }>(),
    'Add Item Failed': props<{ pendingKey: string; error: string }>(),

    'Line Item Started': props<{ lineItemId: string }>(),
    /** `cart` is `null` when Medusa answered a removal without the parent cart. */
    'Line Item Succeeded': props<{ lineItemId: string; cart: HttpTypes.StoreCart | null }>(),
    'Line Item Failed': props<{ lineItemId: string; error: string }>(),

    'Mutation Started': emptyProps(),
    'Mutation Succeeded': props<{ cart: HttpTypes.StoreCart }>(),
    'Mutation Failed': props<{ error: string }>(),
    /**
     * The mutation never started - no cart, or another one still running.
     * Separate from `mutationFailed` so the reducer leaves the running
     * mutation's `loading` alone.
     */
    'Mutation Blocked': props<{ error: string }>(),

    /** On success the cart is spent; `CartEffects` also clears the `cart_id` cookie. */
    'Order Placed': props<{ order: HttpTypes.StoreOrder }>(),
    /** Medusa refused to place the order (e.g. payment not authorized). */
    'Order Rejected': props<{ cart: HttpTypes.StoreCart; message: string }>(),
  },
});

/** Every way a cart-level mutation can end. */
export const CART_MUTATION_RESULTS = [
  CartApiActions.mutationSucceeded,
  CartApiActions.mutationFailed,
  CartApiActions.mutationBlocked,
] as const;

/** Every way `complete` can end. */
export const CART_COMPLETE_RESULTS = [
  CartApiActions.orderPlaced,
  CartApiActions.orderRejected,
  CartApiActions.mutationFailed,
  CartApiActions.mutationBlocked,
] as const;

export const addPendingKey = (variantId: string) => `add:${variantId}`;
