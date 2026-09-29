import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OkklyAlert, OkklyButton, OkklyIcon, OkklySkeleton, OkklyTypography } from '@okkly/angular';
import { iconCheck } from '@okkly/icons';
import { OrderStore } from '../../../../shared/stores/order.store';
import { formatPrice } from '../../../products/product-price';

/**
 * Ported from the Vue storefront's `OrderSuccessScreen`. Reads the order by
 * the `?order_id=` the Review step navigated with — the Store API allows
 * that without authentication, which is what lets a guest checkout land here.
 */
@Component({
  selector: 'app-order-success-screen',
  imports: [OkklyAlert, OkklyButton, OkklyIcon, OkklySkeleton, OkklyTypography, RouterLink],
  templateUrl: './order-success-screen.html',
  styleUrl: './order-success-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessScreen {
  private readonly orders = inject(OrderStore);

  protected readonly iconCheck = iconCheck;

  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  // Always present: `orderSuccessGuard` sends visits without one home.
  protected readonly orderId = computed(() => this.queryParams().get('order_id') ?? '');

  protected readonly order = computed(() => this.orders.getById(this.orderId()) ?? null);
  protected readonly error = this.orders.error;
  protected readonly isPending = computed(() => this.error() === null && this.order() === null);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    effect(() => {
      const id = this.orderId();
      if (id) untracked(() => this.orders.loadById(id));
    });
  }

  protected price(amount: number, currencyCode: string): string {
    return formatPrice({ amount, currencyCode, originalAmount: null });
  }

  protected variantLabel(title: string | null | undefined): string | null {
    return title?.replace(/\s*\/\s*/g, ' · ') ?? null;
  }
}
