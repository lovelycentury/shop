import { InjectionToken, PLATFORM_ID, Service, type Signal, computed, effect, inject, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CartIdService } from '../../core/services/cart-id';
import { CartStore } from '../../shared/stores/cart.store';
import { RegionsStore } from '../../shared/stores/regions.store';
import { CHECKOUT_STEPS, type CheckoutStep, isCheckoutStep } from './checkout.constants';

/**
 * What the checkout screen needs from whichever step is active: the order
 * summary's one action button submits it and shows its pending state.
 */
export interface CheckoutStepHandle {
  submit(): Promise<void>;
  readonly isPending: Signal<boolean>;
}

/** Each step provides itself under this token, so the screen can query the active one. */
export const CHECKOUT_STEP = new InjectionToken<CheckoutStepHandle>('CHECKOUT_STEP');

/**
 * Checkout's shared state, ported from the Vue storefront's
 * `useCheckoutPage`: the cart, the active step (driven by `?step=`, like the
 * catalogue's `?page=`), and how far the cart's own data lets a visitor jump.
 *
 * Provided by `CheckoutScreen`, so the steps rendered inside it share one
 * instance and it goes away with the page.
 */
@Service({ autoProvided: false })
export class CheckoutPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cartId = inject(CartIdService).cartId;
  private readonly cartStore = inject(CartStore);
  private readonly regions = inject(RegionsStore);

  readonly cart = this.cartStore.cart;
  readonly countries = this.regions.countries;

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  readonly step = computed<CheckoutStep>(() => {
    const raw = this.queryParams().get('step');
    return isCheckoutStep(raw) ? raw : 'shipping';
  });

  /** 1-based: index 0 is the stepper's always-done "Cart" node. */
  readonly activeStepIndex = computed(() => CHECKOUT_STEPS.indexOf(this.step()) + 1);

  /**
   * A visitor with no cart id has nothing to wait for — treating that as
   * pending would sit on skeletons for good.
   */
  readonly isPending = computed(
    () =>
      (this.cartId() !== null && this.cart() === null && this.cartStore.error() === null) ||
      (this.regions.regions() === null && this.regions.error() === null),
  );

  /** The cart request itself failed (errors from later mutations are shown by the steps). */
  readonly loadError = computed(() => (this.cart() === null ? this.cartStore.error() : null));

  readonly isEmpty = computed(() => !this.isPending() && (this.cart()?.items?.length ?? 0) === 0);

  /** The furthest step the cart's own data actually supports landing on. */
  readonly furthestUnlockedStep = computed<CheckoutStep>(() => {
    const cart = this.cart();

    if (!cart?.shipping_address) return 'shipping';
    if ((cart.shipping_methods?.length ?? 0) === 0) return 'delivery';
    if ((cart.payment_collection?.payment_sessions?.length ?? 0) === 0) return 'payment';

    return 'review';
  });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    // A direct or refreshed visit past what the cart supports (e.g.
    // `?step=review` on a cart with no address yet) bounces back to the
    // furthest reachable step, rather than rendering a step with nothing
    // to show.
    //
    // Only with a cart to check: with none, the empty state shows instead.
    // That matters right after placing an order — the cart is dropped the
    // moment it's completed, and bouncing to "shipping" then would cancel
    // the Review step's navigation to the order confirmation.
    effect(() => {
      if (this.isPending() || this.isEmpty()) return;

      const step = this.step();
      const furthest = this.furthestUnlockedStep();

      if (CHECKOUT_STEPS.indexOf(step) > CHECKOUT_STEPS.indexOf(furthest)) {
        untracked(() => this.navigateToStep(furthest, { replaceUrl: true }));
      }
    });
  }

  goToStep(next: CheckoutStep): Promise<boolean> {
    return this.navigateToStep(next);
  }

  refetchCart(): void {
    this.cartStore.refresh();
  }

  private navigateToStep(step: CheckoutStep, extras: { replaceUrl?: boolean } = {}): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step },
      queryParamsHandling: 'merge',
      ...extras,
    });
  }
}
