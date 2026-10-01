import { signal } from '@angular/core';
import type { Action } from '@ngrx/store';
import { vi } from 'vitest';
import { CartIdService } from '../../core/services/cart-id';
import { dispatchAndWait } from '../dispatch-and-wait';
import { flushMicrotasks, setupState } from '../testing';
import {
  CART_COMPLETE_RESULTS,
  CART_MUTATION_RESULTS,
  CartActions,
  CartApiActions,
  addPendingKey,
} from './cart.actions';
import { cartFeature } from './cart.reducer';

function setup(
  cartMethods: Record<string, unknown>,
  initialCartId: string | null = null,
  paymentMethods: Record<string, unknown> = {},
) {
  const cartIdService = {
    cartId: signal<string | null>(initialCartId),
    set: vi.fn((id: string) => cartIdService.cartId.set(id)),
    clear: vi.fn(() => cartIdService.cartId.set(null)),
  };

  const state = setupState({ cart: cartMethods, payment: paymentMethods }, [
    { provide: CartIdService, useValue: cartIdService },
  ]);

  return {
    ...state,
    cartIdService,
    cart: () => state.read(cartFeature.selectCart),
    isAdding: (variantId: string) =>
      state.read(cartFeature.selectPendingLineItemIds).includes(addPendingKey(variantId)),
    mutate: (action: Action) =>
      dispatchAndWait(state.store, state.actions$, action, CART_MUTATION_RESULTS),
    complete: () =>
      dispatchAndWait(state.store, state.actions$, CartActions.complete(), CART_COMPLETE_RESULTS),
  };
}

/** Seeds the cart through the real `load` path (needs `retrieve` on the mock). */
async function seedCart({ store }: ReturnType<typeof setup>) {
  store.dispatch(CartActions.load());
  await flushMicrotasks();
}

const addItem = CartActions.addItem({ variantId: 'variant_1', quantity: 1, regionId: 'region_1' });

describe('cart', () => {
  it('addItem creates a cart lazily on first use, then adds the line item', async () => {
    const create = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    const createLineItem = vi.fn().mockResolvedValue({
      cart: { id: 'cart_1', items: [{ id: 'li_1', quantity: 2 }] },
    });
    const { store, cart, cartIdService } = setup({ create, createLineItem });

    store.dispatch(
      CartActions.addItem({ variantId: 'variant_1', quantity: 2, regionId: 'region_1' }),
    );
    await flushMicrotasks();

    expect(create).toHaveBeenCalledWith({ region_id: 'region_1' });
    expect(createLineItem).toHaveBeenCalledWith('cart_1', { variant_id: 'variant_1', quantity: 2 });
    expect(cartIdService.set).toHaveBeenCalledWith('cart_1');
    expect(cart()?.items?.length).toBe(1);
  });

  it('addItem reuses an existing cart id without creating a new cart', async () => {
    const create = vi.fn();
    const createLineItem = vi.fn().mockResolvedValue({
      cart: { id: 'cart_1', items: [{ id: 'li_1', quantity: 1 }] },
    });
    const { store } = setup({ create, createLineItem }, 'cart_1');

    store.dispatch(addItem);
    await flushMicrotasks();

    expect(create).not.toHaveBeenCalled();
    expect(createLineItem).toHaveBeenCalledWith('cart_1', { variant_id: 'variant_1', quantity: 1 });
  });

  it('ignores a duplicate addItem for the same variant while one is in flight', async () => {
    let resolveCreateLineItem!: (value: unknown) => void;
    const createLineItem = vi.fn(() => new Promise((resolve) => (resolveCreateLineItem = resolve)));
    const { store, isAdding } = setup({ create: vi.fn(), createLineItem }, 'cart_1');

    store.dispatch(addItem);
    store.dispatch(addItem);

    expect(isAdding('variant_1')).toBe(true);
    expect(isAdding('variant_2')).toBe(false);

    await flushMicrotasks();
    resolveCreateLineItem({ cart: { id: 'cart_1', items: [{ id: 'li_1', quantity: 1 }] } });
    await flushMicrotasks();

    expect(createLineItem).toHaveBeenCalledTimes(1);
    expect(isAdding('variant_1')).toBe(false);
  });

  it('dedupes concurrent updateLineItem calls for the same line item', async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: 'cart_1', items: [{ id: 'li_1', quantity: 1 }] } });
    const updateLineItem = vi
      .fn()
      .mockResolvedValue({ cart: { id: 'cart_1', items: [{ id: 'li_1', quantity: 5 }] } });
    const state = setup({ retrieve, updateLineItem }, 'cart_1');
    await seedCart(state);

    state.store.dispatch(CartActions.updateLineItem({ lineItemId: 'li_1', body: { quantity: 5 } }));
    state.store.dispatch(CartActions.updateLineItem({ lineItemId: 'li_1', body: { quantity: 5 } }));
    await flushMicrotasks();

    expect(updateLineItem).toHaveBeenCalledTimes(1);
    expect(state.cart()?.items?.[0].quantity).toBe(5);
  });

  it('updates different line items concurrently without blocking each other', async () => {
    const retrieve = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    const updateLineItem = vi.fn(
      (_cartId: string, lineItemId: string, body: { quantity: number }) =>
        Promise.resolve({
          cart: { id: 'cart_1', items: [{ id: lineItemId, quantity: body.quantity }] },
        }),
    );
    const state = setup({ retrieve, updateLineItem }, 'cart_1');
    await seedCart(state);

    state.store.dispatch(CartActions.updateLineItem({ lineItemId: 'li_1', body: { quantity: 2 } }));
    state.store.dispatch(CartActions.updateLineItem({ lineItemId: 'li_2', body: { quantity: 3 } }));
    await flushMicrotasks();

    expect(updateLineItem).toHaveBeenCalledTimes(2);
  });

  it('removeLineItem replaces the cart with the response parent', async () => {
    const retrieve = vi
      .fn()
      .mockResolvedValue({ cart: { id: 'cart_1', items: [{ id: 'li_1', quantity: 1 }] } });
    const deleteLineItem = vi.fn().mockResolvedValue({
      parent: { id: 'cart_1', items: [] },
      id: 'li_1',
      object: 'line-item',
      deleted: true,
    });
    const state = setup({ retrieve, deleteLineItem }, 'cart_1');
    await seedCart(state);

    state.store.dispatch(CartActions.removeLineItem({ lineItemId: 'li_1' }));
    await flushMicrotasks();

    expect(deleteLineItem).toHaveBeenCalledWith('cart_1', 'li_1');
    expect(state.cart()?.items).toEqual([]);
  });

  it('updateCart resolves with success and stores the updated cart', async () => {
    const retrieve = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    const update = vi
      .fn()
      .mockResolvedValue({ cart: { id: 'cart_1', items: [], email: 'a@b.co' } });
    const state = setup({ retrieve, update }, 'cart_1');
    await seedCart(state);

    const result = await state.mutate(CartActions.updateCart({ body: { email: 'a@b.co' } }));

    expect(result.type).toBe(CartApiActions.mutationSucceeded.type);
    expect(update).toHaveBeenCalledWith(
      'cart_1',
      { email: 'a@b.co' },
      { fields: '*payment_collection.payment_sessions' },
    );
    expect(state.cart()?.email).toBe('a@b.co');
    expect(state.read(cartFeature.selectLoading)).toBe(false);
  });

  it('a cart mutation resolves with the error message on failure', async () => {
    const retrieve = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    const addShippingMethod = vi.fn().mockRejectedValue(new Error('Shipping option not available'));
    const state = setup({ retrieve, addShippingMethod }, 'cart_1');
    await seedCart(state);

    const result = await state.mutate(
      CartActions.addShippingMethod({ body: { option_id: 'so_1' } }),
    );

    expect(result).toMatchObject({
      type: CartApiActions.mutationFailed.type,
      error: 'Shipping option not available',
    });
    expect(state.read(cartFeature.selectLoading)).toBe(false);
  });

  it('blocks a second cart mutation while one is in flight', async () => {
    const retrieve = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    let resolveUpdate!: (value: unknown) => void;
    const update = vi.fn(() => new Promise((resolve) => (resolveUpdate = resolve)));
    const state = setup({ retrieve, update }, 'cart_1');
    await seedCart(state);

    state.store.dispatch(CartActions.updateCart({ body: { email: 'a@b.co' } }));
    const second = await state.mutate(CartActions.updateCart({ body: { email: 'c@d.co' } }));

    expect(second.type).toBe(CartApiActions.mutationBlocked.type);
    // The running mutation is still running.
    expect(state.read(cartFeature.selectLoading)).toBe(true);

    await flushMicrotasks();
    resolveUpdate({ cart: { id: 'cart_1', items: [] } });
    await flushMicrotasks();

    expect(update).toHaveBeenCalledTimes(1);
    expect(state.read(cartFeature.selectLoading)).toBe(false);
  });

  it('createPaymentSession refetches the cart to pick up the new session', async () => {
    const sessionCart = {
      id: 'cart_1',
      items: [],
      payment_collection: { payment_sessions: [{ id: 'ps_1' }] },
    };
    const retrieve = vi
      .fn()
      .mockResolvedValueOnce({ cart: { id: 'cart_1', items: [] } })
      .mockResolvedValueOnce({ cart: sessionCart });
    const initiatePaymentSession = vi.fn().mockResolvedValue({});
    const state = setup({ retrieve }, 'cart_1', { initiatePaymentSession });
    await seedCart(state);

    const result = await state.mutate(
      CartActions.createPaymentSession({ body: { provider_id: 'pp_system_default' } }),
    );

    expect(result.type).toBe(CartApiActions.mutationSucceeded.type);
    expect(initiatePaymentSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'cart_1' }), {
      provider_id: 'pp_system_default',
    });
    expect(state.cart()).toEqual(sessionCart);
  });

  it('complete places the order and clears the cart on success', async () => {
    const retrieve = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    const complete = vi.fn().mockResolvedValue({ type: 'order', order: { id: 'order_1' } });
    const state = setup({ retrieve, complete }, 'cart_1');
    await seedCart(state);

    const result = await state.complete();

    expect(result).toMatchObject({
      type: CartApiActions.orderPlaced.type,
      order: { id: 'order_1' },
    });
    expect(state.cart()).toBeNull();
    expect(state.cartIdService.clear).toHaveBeenCalled();
  });

  it('complete reports a rejection without clearing the cart', async () => {
    const errorCart = { id: 'cart_1', items: [] };
    const retrieve = vi.fn().mockResolvedValue({ cart: errorCart });
    const complete = vi.fn().mockResolvedValue({
      type: 'cart',
      cart: errorCart,
      error: { message: 'Payment required', name: 'x', type: 'x' },
    });
    const state = setup({ retrieve, complete }, 'cart_1');
    await seedCart(state);

    const result = await state.complete();

    expect(result).toMatchObject({
      type: CartApiActions.orderRejected.type,
      message: 'Payment required',
    });
    expect(state.read(cartFeature.selectError)).toBe('Payment required');
    expect(state.cart()).toEqual(errorCart);
    expect(state.cartIdService.clear).not.toHaveBeenCalled();
  });

  it('complete reports a failed request as failed, not rejected', async () => {
    const retrieve = vi.fn().mockResolvedValue({ cart: { id: 'cart_1', items: [] } });
    const complete = vi.fn().mockRejectedValue(new Error('Network down'));
    const state = setup({ retrieve, complete }, 'cart_1');
    await seedCart(state);

    const result = await state.complete();

    expect(result).toMatchObject({
      type: CartApiActions.mutationFailed.type,
      error: 'Network down',
    });
    expect(state.cartIdService.clear).not.toHaveBeenCalled();
  });
});
