import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OkklyBadge, OkklyIcon, OkklyIconButton } from '@okkly/angular';
import { iconShoppingCart } from '@okkly/icons';
import { CartDrawerState } from '../../features/cart/cart-drawer.state';
import { CartStore } from '../../shared/stores/cart.store';

/** Ported from the Vue storefront's `widgets/Header`. */
@Component({
  selector: 'app-header',
  imports: [OkklyBadge, OkklyIcon, OkklyIconButton, RouterLink],
  styleUrl: './header.scss',
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly cart = inject(CartStore);
  protected readonly drawer = inject(CartDrawerState);

  protected readonly iconShoppingCart = iconShoppingCart;

  constructor() {
    // The badge needs the cart on every page; `load` no-ops for a visitor
    // with no cart yet and once it's loaded.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.cart.load();
    }
  }
}
