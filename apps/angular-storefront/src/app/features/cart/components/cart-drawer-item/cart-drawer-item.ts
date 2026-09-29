import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import { OkklyIcon, OkklyTypography } from '@okkly/angular';
import { iconImage, iconX } from '@okkly/icons';
import type { HttpTypes } from '@medusajs/types';
import { QuantityStepper } from '../../../../shared/components/quantity-stepper/quantity-stepper';
import { formatPrice } from '../../../products/product-price';

@Component({
  selector: 'app-cart-drawer-item',
  imports: [OkklyIcon, OkklyTypography, QuantityStepper],
  template: `
    <div class="cart-item__media">
      @if (item().thumbnail; as thumbnail) {
        <img [src]="thumbnail" [alt]="item().title" class="cart-item__image" />
      } @else {
        <div class="cart-item__image-fallback" aria-hidden="true">
          <okkly-icon [icon]="iconImage" fontSize="small" />
        </div>
      }
    </div>

    <div class="cart-item__body">
      <div class="cart-item__row">
        <span okklyTypography variant="label-md" class="cart-item__title">{{ item().title }}</span>
        <button
          type="button"
          class="cart-item__remove"
          [attr.aria-label]="'Remove ' + item().title"
          [disabled]="pending()"
          (click)="remove.emit()"
        >
          <okkly-icon [icon]="iconX" fontSize="small" />
        </button>
      </div>

      @if (variantLabel(); as label) {
        <span okklyTypography variant="caption" color="muted">{{ label }}</span>
      }

      <div class="cart-item__row">
        <span okklyTypography variant="label-md">{{ formattedPrice() }}</span>
        <app-quantity-stepper
          [value]="item().quantity"
          (valueChange)="updateQuantity.emit($event)"
          [disabled]="pending()"
        />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: 0.875rem;
      width: 100%;
    }

    .cart-item__media {
      flex-shrink: 0;
      width: 4rem;
      height: 4rem;
      overflow: hidden;
      border: 1px solid var(--okkly-border-subtle);
      border-radius: var(--okkly-radius-lg);
      background: var(--okkly-bg-inset);
    }

    .cart-item__image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cart-item__image-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--okkly-text-muted);
    }

    .cart-item__body {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: 0.375rem;
      min-width: 0;
    }

    .cart-item__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--okkly-space-2);
    }

    .cart-item__title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cart-item__remove {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border: none;
      padding: 0;
      background: none;
      color: var(--okkly-text-muted);
      cursor: pointer;
    }

    .cart-item__remove:hover:not(:disabled) {
      color: var(--okkly-text-primary);
    }

    .cart-item__remove:disabled {
      cursor: not-allowed;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerItem {
  readonly item = input.required<HttpTypes.StoreCartLineItem>();
  readonly currencyCode = input.required<string>();
  /**
   * An update/remove for this line is in flight. `CartStore` drops repeat
   * calls for the same line until it lands, so the controls lock rather
   * than swallow clicks silently.
   */
  readonly pending = input(false, { transform: booleanAttribute });

  readonly updateQuantity = output<number>();
  readonly remove = output<void>();

  protected readonly iconImage = iconImage;
  protected readonly iconX = iconX;

  /**
   * Medusa joins a variant's option values with " / " (e.g. "S / White") —
   * " · " is this design's own separator, matching the product page.
   */
  protected readonly variantLabel = computed(
    () => this.item().variant_title?.replace(/\s*\/\s*/g, ' · ') ?? null,
  );

  protected readonly formattedPrice = computed(() =>
    formatPrice({ amount: this.item().unit_price, currencyCode: this.currencyCode(), originalAmount: null }),
  );
}
