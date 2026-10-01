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
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { CartIdService } from '../../core/services/cart-id';
import { CartActions } from '../../state/cart/cart.actions';
import { type CartState, initialCartState } from '../../state/cart/cart.reducer';
import { checkoutStepGuard, orderSuccessGuard } from './checkout.guards';

type FakeCart = Record<string, unknown> | null;

const cartSlice = (cart: FakeCart, loading: boolean) => ({
  cart: { ...initialCartState, cart, loading } as CartState,
});

/** `MockStore` has no reducers or effects - the spec sets state directly and checks what was dispatched. */
function setup({ cartId = 'cart_1', cart = null as FakeCart, loading = false } = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideMockStore({ initialState: cartSlice(cart, loading) }),
      { provide: CartIdService, useValue: { cartId: signal(cartId) } },
    ],
  });

  const store = TestBed.inject(MockStore);
  const dispatch = vi.spyOn(store, 'dispatch');

  return { store, dispatch };
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
    const { dispatch } = setup({ cartId: null as unknown as string });

    expect(await runStepGuard({ step: 'review' })).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('lets an empty cart through, for the empty state', async () => {
    setup({ cart: { items: [] } });

    expect(await runStepGuard({ step: 'review' })).toBe(true);
  });

  it('waits for an in-flight cart request before deciding', async () => {
    const { store, dispatch } = setup({ cart: null, loading: true });

    const result = runStepGuard({ step: 'review' });
    store.setState(cartSlice(withAddress, false));

    expect(serialize(await result)).toBe('/checkout?step=delivery');
    expect(dispatch).toHaveBeenCalledWith(CartActions.load());
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
