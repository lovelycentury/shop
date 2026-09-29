import { Service, signal } from '@angular/core';

/**
 * Whether the cart drawer is open — UI state shared by whatever opens it
 * (the header's cart button) and the drawer itself. Ported from the Vue
 * storefront's `isCartOpen` ref; kept out of `CartStore`, which holds the
 * cart's data, not how it is being shown.
 */
@Service()
export class CartDrawerState {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
