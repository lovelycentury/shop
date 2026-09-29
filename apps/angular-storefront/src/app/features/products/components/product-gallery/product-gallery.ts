import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { OkklyIcon } from '@okkly/angular';
import { iconImage } from '@okkly/icons';
import type { HttpTypes } from '@medusajs/types';

@Component({
  selector: 'app-product-gallery',
  imports: [OkklyIcon],
  template: `
    <div class="product-gallery__main">
      @if (activeImage(); as src) {
        <img [src]="src" [alt]="product().title" class="product-gallery__main-image" />
      } @else {
        <div class="product-gallery__main-fallback" aria-hidden="true">
          <okkly-icon [icon]="iconImage" fontSize="large" />
        </div>
      }
    </div>

    @if (images().length > 1) {
      <div class="product-gallery__thumbs" role="tablist">
        @for (image of images(); track image; let index = $index) {
          <button
            type="button"
            role="tab"
            class="product-gallery__thumb"
            [class.product-gallery__thumb--active]="index === activeIndex()"
            [attr.aria-selected]="index === activeIndex()"
            [attr.aria-label]="'Show image ' + (index + 1)"
            (click)="activeIndex.set(index)"
          >
            <img [src]="image" [alt]="product().title + ' thumbnail ' + (index + 1)" />
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .product-gallery__main {
      aspect-ratio: 360 / 421;
      overflow: hidden;
      border: 1px solid var(--okkly-border-subtle);
      border-radius: var(--okkly-radius-lg);
      background: var(--okkly-bg-inset);
    }

    .product-gallery__main-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-gallery__main-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--okkly-text-muted);
    }

    .product-gallery__thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
    }

    .product-gallery__thumb {
      width: 4rem;
      height: 4rem;
      overflow: hidden;
      border: 1px solid var(--okkly-border-subtle);
      border-radius: var(--okkly-radius-md);
      padding: 0;
      background: var(--okkly-bg-inset);
      cursor: pointer;
      opacity: 0.7;
      transition:
        opacity 160ms ease,
        border-color 160ms ease;
    }

    .product-gallery__thumb:hover {
      opacity: 1;
    }

    .product-gallery__thumb--active {
      border: 2px solid var(--okkly-accent-primary);
      opacity: 1;
    }

    .product-gallery__thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGallery {
  readonly product = input.required<HttpTypes.StoreProduct>();

  protected readonly iconImage = iconImage;

  protected readonly images = computed(() => {
    const product = this.product();
    const fromImages = product.images?.map((image) => image.url) ?? [];

    if (fromImages.length > 0) return fromImages;

    return product.thumbnail ? [product.thumbnail] : [];
  });

  /** Back to the first image whenever a different product is shown. */
  protected readonly activeIndex = linkedSignal({
    source: () => this.product().id,
    computation: () => 0,
  });

  protected readonly activeImage = computed(
    () => this.images()[this.activeIndex()] ?? this.product().thumbnail ?? null,
  );
}
