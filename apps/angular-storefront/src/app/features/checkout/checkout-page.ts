import { InjectionToken, Service, type Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CartIdService } from '../../core/services/cart-id';
import { CartStore } from '../../shared/stores/cart.store';
import { RegionsStore } from '../../shared/stores/regions.store';
import { CHECKOUT_STEPS, type CheckoutStep, parseCheckoutStep } from './checkout.constants';

/**
 * What the checkout screen needs from whichever step is active: the order
 * summary's one action button submits it and shows its pending state.
 */
export interface CheckoutStepHandle {
  submit(): Promise<void>;
  readonly isPending: Signal<boolean>;
  /** Input the visitor would lose by leaving; steps with nothing to type in can leave it out. */
  hasUnsavedChanges?(): boolean;
}

/** Each step provides itself under this token, so the screen can query the active one. */
export const CHECKOUT_STEP = new InjectionToken<CheckoutStepHandle>('CHECKOUT_STEP');

/**
 * Checkout's shared state, ported from the Vue storefront's
 * `useCheckoutPage`: the cart and the active step (driven by `?step=`, like
 * the catalogue's `?page=`).
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

  readonly step = computed(() => parseCheckoutStep(this.queryParams().get('step')));

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

  /**
   * Which step may be entered is decided before navigation by
   * `checkoutStepGuard`, so this just moves along.
   */
  goToStep(next: CheckoutStep): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: next },
      queryParamsHandling: 'merge',
    });
  }

  refetchCart(): void {
    this.cartStore.refresh();
  }
}
