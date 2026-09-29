import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { vi } from 'vitest';
import { CartIdService } from '../../core/services/cart-id';
import { CartStore } from '../../shared/stores/cart.store';
import { checkoutStepGuard, orderSuccessGuard } from './checkout.guards';

type FakeCart = Record<string, unknown> | null;

function setup({ cartId = 'cart_1', cart = null as FakeCart, loading = false } = {}) {
  const cartStore = {
    cart: signal<FakeCart>(cart),
    loading: signal(loading),
    load: vi.fn(),
  };

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CartStore, useValue: cartStore },
      { provide: CartIdService, useValue: { cartId: signal(cartId) } },
    ],
  });

  return cartStore;
}

const routeWith = (query: Record<string, string>) =>
  ({ queryParamMap: convertToParamMap(query) }) as ActivatedRouteSnapshot;

const runStepGuard = (query: Record<string, string>) =>
  TestBed.runInInjectionContext(() => checkoutStepGuard(routeWith(query), {} as RouterStateSnapshot)) as Promise<
    boolean | UrlTree
  >;

const serialize = (result: boolean | UrlTree) =>
  result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

const item = { id: 'li_1', quantity: 1 };
const withAddress = { items: [item], shipping_address: { city: 'Aarhus' } };
const withShipping = { ...withAddress, shipping_methods: [{ id: 'sm_1' }] };

describe('checkoutStepGuard', () => {
  it('sends a step past what the cart supports back to the furthest reachable one', async () => {
    setup({ cart: withAddress });

    expect(serialize(await runStepGuard({ step: 'review' }))).toBe('/checkout?step=delivery');
  });

  it('lets through a step the cart has the data for', async () => {
    setup({ cart: withShipping });

    expect(await runStepGuard({ step: 'payment' })).toBe(true);
    expect(await runStepGuard({ step: 'shipping' })).toBe(true);
  });

  it('treats a missing or unknown step as the first one', async () => {
    setup({ cart: { items: [item] } });

    expect(await runStepGuard({})).toBe(true);
    expect(await runStepGuard({ step: 'nonsense' })).toBe(true);
  });

  it('lets a visitor with no cart through, for the empty state', async () => {
    const cartStore = setup({ cartId: null as unknown as string });

    expect(await runStepGuard({ step: 'review' })).toBe(true);
    expect(cartStore.load).not.toHaveBeenCalled();
  });

  it('lets an empty cart through, for the empty state', async () => {
    setup({ cart: { items: [] } });

    expect(await runStepGuard({ step: 'review' })).toBe(true);
  });

  it('waits for an in-flight cart request before deciding', async () => {
    const cartStore = setup({ cart: null, loading: true });

    const result = runStepGuard({ step: 'review' });
    cartStore.cart.set(withAddress);
    cartStore.loading.set(false);
    TestBed.tick();

    expect(serialize(await result)).toBe('/checkout?step=delivery');
    expect(cartStore.load).toHaveBeenCalled();
  });
});

describe('orderSuccessGuard', () => {
  const runSuccessGuard = (query: Record<string, string>) =>
    TestBed.runInInjectionContext(() => orderSuccessGuard(routeWith(query), {} as RouterStateSnapshot)) as
      | boolean
      | UrlTree;

  it('lets a visit with an order id through', () => {
    setup();

    expect(runSuccessGuard({ order_id: 'order_1' })).toBe(true);
  });

  it('sends a visit without an order id home', () => {
    setup();

    expect(serialize(runSuccessGuard({}))).toBe('/');
  });
});
