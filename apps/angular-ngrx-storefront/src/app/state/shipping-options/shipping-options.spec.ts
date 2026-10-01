import { vi } from 'vitest';
import { flushMicrotasks, setupState } from '../testing';
import { ShippingOptionsActions } from './shipping-options.actions';
import { shippingOptionsFeature } from './shipping-options.reducer';

const setup = (listCartOptions: (query: { cart_id: string }) => Promise<unknown>) =>
  setupState({ fulfillment: { listCartOptions } });

const byCart = (query: { cart_id: string }) =>
  Promise.resolve({ shipping_options: [{ id: `so_${query.cart_id}` }] });

describe('shipping options', () => {
  it('load skips an already-loaded cart but fetches a new one', async () => {
    const listCartOptions = vi.fn(byCart);
    const { store, read } = setup(listCartOptions);

    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_1' }));
    await flushMicrotasks();
    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_1' }));
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(1);
    expect(read(shippingOptionsFeature.selectCartId)).toBe('cart_1');
    expect(read(shippingOptionsFeature.selectShippingOptions)).toEqual([{ id: 'so_cart_1' }]);

    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_2' }));
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(2);
    expect(read(shippingOptionsFeature.selectCartId)).toBe('cart_2');
  });

  it('refresh refetches an already-loaded cart', async () => {
    const listCartOptions = vi.fn(byCart);
    const { store } = setup(listCartOptions);

    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_1' }));
    await flushMicrotasks();
    store.dispatch(ShippingOptionsActions.refresh({ cartId: 'cart_1' }));
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(2);
  });

  it('never runs two requests at once', async () => {
    const listCartOptions = vi.fn(byCart);
    const { store, read } = setup(listCartOptions);

    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_1' }));
    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_2' }));
    store.dispatch(ShippingOptionsActions.refresh({ cartId: 'cart_1' }));
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(1);
    expect(read(shippingOptionsFeature.selectLoading)).toBe(false);
  });

  it('allows retrying the same cart after a failure', async () => {
    const listCartOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ shipping_options: [{ id: 'so_1' }] });
    const { store, read } = setup(listCartOptions);

    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_1' }));
    await flushMicrotasks();
    expect(read(shippingOptionsFeature.selectError)).toBe('Error: network error');
    expect(read(shippingOptionsFeature.selectCartId)).toBeNull();

    store.dispatch(ShippingOptionsActions.load({ cartId: 'cart_1' }));
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(2);
    expect(read(shippingOptionsFeature.selectError)).toBeNull();
    expect(read(shippingOptionsFeature.selectShippingOptions)).toEqual([{ id: 'so_1' }]);
  });
});
