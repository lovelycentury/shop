import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MedusaSdk } from '../../core/services/medusa-sdk';
import { ShippingOptionsStore } from './shipping-options.store';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(listCartOptions: (query: { cart_id: string }) => Promise<unknown>) {
  TestBed.configureTestingModule({
    providers: [{ provide: MedusaSdk, useValue: { store: { fulfillment: { listCartOptions } } } }],
  });

  return TestBed.inject(ShippingOptionsStore);
}

const byCart = (query: { cart_id: string }) =>
  Promise.resolve({ shipping_options: [{ id: `so_${query.cart_id}` }] });

describe('ShippingOptionsStore', () => {
  it('load skips an already-loaded cart but fetches a new one', async () => {
    const listCartOptions = vi.fn(byCart);
    const store = setup(listCartOptions);

    store.load('cart_1');
    await flushMicrotasks();
    store.load('cart_1');
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(1);
    expect(store.cartId()).toBe('cart_1');
    expect(store.getAll()).toEqual([{ id: 'so_cart_1' }]);
    expect(store.getById('so_cart_1')).toEqual({ id: 'so_cart_1' });
    expect(store.getById('missing')).toBeUndefined();

    store.load('cart_2');
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(2);
    expect(store.cartId()).toBe('cart_2');
  });

  it('refresh refetches an already-loaded cart', async () => {
    const listCartOptions = vi.fn(byCart);
    const store = setup(listCartOptions);

    store.load('cart_1');
    await flushMicrotasks();
    store.refresh('cart_1');
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(2);
  });

  it('never runs two requests at once', async () => {
    const listCartOptions = vi.fn(byCart);
    const store = setup(listCartOptions);

    store.load('cart_1');
    store.load('cart_2');
    store.refresh('cart_1');
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(1);
    expect(store.loading()).toBe(false);
  });

  it('allows retrying the same cart after a failure', async () => {
    const listCartOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ shipping_options: [{ id: 'so_1' }] });
    const store = setup(listCartOptions);

    store.load('cart_1');
    await flushMicrotasks();
    expect(store.error()).toBe('Error: network error');
    expect(store.cartId()).toBeNull();

    store.load('cart_1');
    await flushMicrotasks();

    expect(listCartOptions).toHaveBeenCalledTimes(2);
    expect(store.error()).toBeNull();
    expect(store.getAll()).toEqual([{ id: 'so_1' }]);
  });
});
