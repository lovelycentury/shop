import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OkklyIcon, OkklyTypography } from '@okkly/angular';
import { iconImage } from '@okkly/icons';
import type { HttpTypes } from '@medusajs/types';
import { formatOriginalPrice, formatPrice, getProductPrice } from '../../product-price';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, OkklyIcon, OkklyTypography],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<HttpTypes.StoreProduct>();
  /** Cards above the fold should load their image eagerly; the rest wait. */
  readonly priority = input(false, { transform: booleanAttribute });

  protected readonly iconImage = iconImage;

  private readonly price = computed(() => getProductPrice(this.product()));

  protected readonly formattedPrice = computed(() => {
    const price = this.price();
    return price === null ? null : formatPrice(price);
  });

  protected readonly formattedOriginalPrice = computed(() => {
    const price = this.price();
    return price === null ? null : formatOriginalPrice(price);
  });

  protected readonly image = computed(
    () => this.product().thumbnail ?? this.product().images?.[0]?.url ?? null,
  );

  protected readonly subtitle = computed(
    () => this.product().collection?.title ?? this.product().type?.value ?? null,
  );
}
