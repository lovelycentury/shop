import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import type { HttpTypes } from '@medusajs/types';
import { ProductCard } from '../product-card/product-card';
import { ProductCardSkeleton } from '../product-card-skeleton/product-card-skeleton';

/** The first row, whichever breakpoint is in play, is worth loading eagerly. */
const PRIORITY_CARDS = 4;

@Component({
  selector: 'app-product-grid',
  imports: [ProductCard, ProductCardSkeleton],
  template: `
    <ul class="product-grid" [class.product-grid--stale]="stale()" [attr.aria-busy]="pending() || stale()">
      @if (pending()) {
        @for (index of skeletons(); track index) {
          <li><app-product-card-skeleton /></li>
        }
      } @else {
        @for (product of products(); track product.id; let index = $index) {
          <li><app-product-card [product]="product" [priority]="index < priorityCards" /></li>
        }
      }
    </ul>
  `,
  styles: `
    .product-grid {
      display: grid;
      /* auto-fill rather than a breakpoint ladder: the column count follows
         the width the grid actually gets. */
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--okkly-space-6);
      margin: 0;
      padding: 0;
      list-style: none;
      transition: opacity 160ms ease;
    }

    .product-grid--stale {
      opacity: 0.6;
      /* The cards shown belong to the previous page - don't let them be
         clicked while the next one is landing. */
      pointer-events: none;
    }

    @media (max-width: 480px) {
      .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
        gap: var(--okkly-space-4);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .product-grid {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGrid {
  readonly products = input.required<HttpTypes.StoreProduct[]>();
  /** Renders placeholder cards instead of the products. */
  readonly pending = input(false, { transform: booleanAttribute });
  /** How many placeholders to draw - normally the page size. */
  readonly skeletonCount = input(12);
  /** Dims the grid while a new page loads over the previous one. */
  readonly stale = input(false, { transform: booleanAttribute });

  protected readonly priorityCards = PRIORITY_CARDS;
  protected readonly skeletons = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));
}
