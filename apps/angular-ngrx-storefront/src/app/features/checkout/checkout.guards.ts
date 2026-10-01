import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { type CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, firstValueFrom, map } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { CartIdService } from '../../core/services/cart-id';
import { CartActions } from '../../state/cart/cart.actions';
import { cartFeature } from '../../state/cart/cart.reducer';
import { CHECKOUT_STEPS, furthestUnlockedStep, parseCheckoutStep } from './checkout.constants';

/**
 * Keeps `?step=` within what the cart's own data supports — `?step=review`
 * on a cart with no address yet lands on the furthest step it can reach
 * instead. Runs on every `?step=` change (see the route's
 * `runGuardsAndResolvers`), so it covers direct links, reloads, hand-edited
 * URLs and back/forward alike, and decides before the step ever renders.
 *
 * Lets the navigation through when there's no cart with items to check:
 * the screen shows its empty state (or load error) for that.
 */
export const checkoutStepGuard: CanActivateFn = async (route) => {
  // Data is only loaded in the browser; the server renders the skeleton.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  if (inject(CartIdService).cartId() === null) return true;

  const router = inject(Router);
  const cart = await loadedCart(inject(Store));

  if (!cart || (cart.items?.length ?? 0) === 0) return true;

  const step = parseCheckoutStep(route.queryParamMap.get('step'));
  const furthest = furthestUnlockedStep(cart);

  return CHECKOUT_STEPS.indexOf(step) > CHECKOUT_STEPS.indexOf(furthest)
    ? router.createUrlTree(['/checkout'], { queryParams: { step: furthest } })
    : true;
};

/** The confirmation page reads the order by `?order_id=`; without one there's nothing to show. */
export const orderSuccessGuard: CanActivateFn = (route) =>
  route.queryParamMap.get('order_id') ? true : inject(Router).createUrlTree(['/']);

/**
 * The cart once no request for it is in flight — kicking one off if it
 * hasn't been loaded yet. `null` when loading failed.
 */
function loadedCart(store: Store): Promise<HttpTypes.StoreCart | null> {
  // Reducers run synchronously on dispatch, so by the time `select` is
  // subscribed `loading` already reflects a request this kicked off.
  store.dispatch(CartActions.load());

  return firstValueFrom(
    store.select(cartFeature.selectCartState).pipe(
      filter((state) => !state.loading),
      map((state) => state.cart),
    ),
  );
}
