import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  OkklyButton,
  OkklyButtonEndIcon,
  OkklyIcon,
  OkklyIconButton,
  OkklyModal,
  OkklySkeleton,
  OkklyTypography,
} from '@okkly/angular';
import { iconArrowRight, iconShoppingCart, iconX } from '@okkly/icons';
import { PricePipe } from '../../../../shared/pipes/price-pipe';
import { CartActions } from '../../../../state/cart/cart.actions';
import { cartFeature } from '../../../../state/cart/cart.reducer';
import { CartDrawerState } from '../../cart-drawer.state';
import { CartDrawerItem } from '../../components/cart-drawer-item/cart-drawer-item';

const DRAWER_CLASSES = 'okkly-component okkly-drawer okkly-drawer--variant-temporary okkly-drawer--anchor-right';

/**
 * The cart as a right-hand drawer, ported from the Vue storefront's
 * `CartDrawer` + `useCartDrawer`.
 *
 * `@okkly/angular` has no Drawer, so this composes `OkklyModal` (portal,
 * backdrop, focus trap, Escape, scroll lock) with the design system's drawer
 * classes — the same structure `@okkly/vue`'s `Drawer` renders.
 */
@Component({
  selector: 'app-cart-drawer',
  imports: [
    CartDrawerItem,
    OkklyButton,
    OkklyButtonEndIcon,
    OkklyIcon,
    OkklyIconButton,
    OkklyModal,
    OkklySkeleton,
    OkklyTypography,
    PricePipe,
  ],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawer {
  private readonly router = inject(Router);
  private readonly drawer = inject(CartDrawerState);
  private readonly store = inject(Store);

  private readonly cart = this.store.selectSignal(cartFeature.selectCart);
  private readonly loading = this.store.selectSignal(cartFeature.selectLoading);
  private readonly pendingLineItemIds = this.store.selectSignal(
    cartFeature.selectPendingLineItemIds,
  );
  protected readonly itemCount = this.store.selectSignal(cartFeature.selectItemCount);

  protected readonly iconArrowRight = iconArrowRight;
  protected readonly iconShoppingCart = iconShoppingCart;
  protected readonly iconX = iconX;

  protected readonly isOpen = this.drawer.isOpen;

  /**
   * Mounted on first open and kept mounted after (`keepMounted`), so closing
   * can slide the panel out instead of it vanishing.
   */
  protected readonly mounted = signal(false);

  /**
   * Trails `isOpen` by two frames when opening: the panel has to be painted
   * at its closed position first, or there's no transform to transition
   * from and it just appears.
   */
  private readonly slidIn = signal(false);

  protected readonly modalClass = computed(() => `${DRAWER_CLASSES}${this.slidIn() ? ' okkly-drawer--open' : ''}`);

  protected readonly items = computed(() => this.cart()?.items ?? []);
  protected readonly currencyCode = computed(() => this.cart()?.currency_code ?? 'usd');

  /** Items only — Medusa's `subtotal` also counts a chosen shipping method, which isn't in this list. */
  protected readonly subtotal = computed(() => this.cart()?.item_subtotal ?? 0);

  /** The cart is known to exist but hasn't landed yet. */
  protected readonly isPending = computed(() => this.cart() === null && this.loading());

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    let frames: number[] = [];
    inject(DestroyRef).onDestroy(() => frames.forEach(cancelAnimationFrame));

    effect(() => {
      frames.forEach(cancelAnimationFrame);
      frames = [];

      if (!this.isOpen()) {
        this.slidIn.set(false);
        return;
      }

      this.mounted.set(true);
      frames.push(requestAnimationFrame(() => frames.push(requestAnimationFrame(() => this.slidIn.set(true)))));
    });
  }

  protected close(): void {
    this.drawer.close();
  }

  protected isLinePending(lineItemId: string): boolean {
    return this.pendingLineItemIds().includes(lineItemId);
  }

  protected setQuantity(lineItemId: string, quantity: number): void {
    if (quantity < 1) return;

    this.store.dispatch(CartActions.updateLineItem({ lineItemId, body: { quantity } }));
  }

  protected removeItem(lineItemId: string): void {
    this.store.dispatch(CartActions.removeLineItem({ lineItemId }));
  }

  protected goToCheckout(): void {
    this.close();
    void this.router.navigateByUrl('/checkout');
  }
}
