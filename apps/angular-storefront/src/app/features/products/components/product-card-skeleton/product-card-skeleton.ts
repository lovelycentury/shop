import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OkklySkeleton } from '@okkly/angular';

/**
 * Deliberately mirrors `ProductCard`'s box model - same radius, same 4/5
 * media ratio - so the grid does not reflow when the real cards replace these.
 */
@Component({
  selector: 'app-product-card-skeleton',
  imports: [OkklySkeleton],
  template: `
    <okkly-skeleton variant="rectangular" class="product-card-skeleton__media" />
    <div class="product-card-skeleton__body">
      <okkly-skeleton width="80%" />
      <okkly-skeleton width="45%" />
      <okkly-skeleton width="30%" />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      border: 1px solid var(--okkly-glass-border);
      border-radius: var(--okkly-radius-xl);
      background: var(--okkly-glass-fill);
    }

    .product-card-skeleton__media {
      aspect-ratio: 4 / 5;
      width: 100%;
      height: auto;
    }

    .product-card-skeleton__body {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: var(--okkly-space-1);
      padding: var(--okkly-space-4);
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardSkeleton {}
