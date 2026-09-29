import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OkklyIcon, OkklyTypography } from '@okkly/angular';
import { iconImage } from '@okkly/icons';
import type { HttpTypes } from '@medusajs/types';
import { formatAmount } from '../../../../shared/models/price';
import { PricePipe } from '../../../../shared/pipes/price-pipe';

/**
 * The cart's items and totals beside the checkout steps, ported from the
 * Vue storefront's `OrderSummary`. The step's action button is projected in
 * at the bottom.
 */
@Component({
  selector: 'app-order-summary',
  imports: [OkklyIcon, OkklyTypography, PricePipe],
  template: `
    <ul class="order-summary__items">
      @for (item of items(); track item.id) {
        <li class="order-summary__item">
          <div class="order-summary__item-media">
            @if (item.thumbnail; as thumbnail) {
              <img [src]="thumbnail" [alt]="item.title" class="order-summary__item-image" />
            } @else {
              <div class="order-summary__item-fallback" aria-hidden="true">
                <okkly-icon [icon]="iconImage" fontSize="small" />
              </div>
            }
            <span class="order-summary__item-qty">{{ item.quantity }}</span>
          </div>
          <div class="order-summary__item-body">
            <span okklyTypography variant="label-sm" class="order-summary__item-title">{{ item.title }}</span>
            @if (variantLabel(item); as label) {
              <span okklyTypography variant="caption" color="muted">{{ label }}</span>
            }
          </div>
          <span okklyTypography variant="label-sm" class="order-summary__item-price">
            {{ item.unit_price * item.quantity | price: currencyCode() }}
          </span>
        </li>
      }
    </ul>

    <hr class="order-summary__divider" />

    <div class="order-summary__totals">
      <div class="order-summary__row">
        <span okklyTypography variant="body-sm" color="secondary">Subtotal</span>
        <span okklyTypography variant="body-sm">{{ subtotal() | price: currencyCode() }}</span>
      </div>
      <div class="order-summary__row">
        <span okklyTypography variant="body-sm" color="secondary">Shipping</span>
        <span okklyTypography variant="body-sm">{{ formattedShipping() }}</span>
      </div>
      <hr class="order-summary__divider" />
      <div class="order-summary__row">
        <span okklyTypography variant="label-md">Total</span>
        <span okklyTypography variant="h4">{{ total() | price: currencyCode() }}</span>
      </div>
    </div>

    <div class="order-summary__action">
      <ng-content />
    </div>
  `,
  styleUrl: './order-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummary {
  readonly items = input.required<HttpTypes.StoreCartLineItem[]>();
  readonly currencyCode = input.required<string>();
  /** Items only — Medusa's own `subtotal` already includes shipping, which has its own row here. */
  readonly subtotal = input.required<number>();
  /** `null` while no shipping method is chosen yet — shown as "Calculated next". */
  readonly shipping = input.required<number | null>();
  readonly total = input.required<number>();

  protected readonly iconImage = iconImage;

  protected readonly formattedShipping = computed(() => {
    const shipping = this.shipping();
    return shipping === null ? 'Calculated next' : formatAmount(shipping, this.currencyCode());
  });

  protected variantLabel(item: HttpTypes.StoreCartLineItem): string | null {
    return item.variant_title?.replace(/\s*\/\s*/g, ' · ') ?? null;
  }
}
