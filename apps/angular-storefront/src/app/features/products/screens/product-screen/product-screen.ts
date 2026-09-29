import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  OkklyAccordion,
  OkklyAccordionDetails,
  OkklyAccordionSummary,
  OkklyAlert,
  OkklyAlertAction,
  OkklyBreadcrumbs,
  OkklyButton,
  OkklyButtonEndIcon,
  OkklyButtonStartIcon,
  OkklyIcon,
  OkklySkeleton,
  OkklyTypography,
} from '@okkly/angular';
import { iconArrowRight, iconRefreshCw } from '@okkly/icons';
import { QuantityStepper } from '../../../../shared/components/quantity-stepper/quantity-stepper';
import { CartStore } from '../../../../shared/stores/cart.store';
import { RelatedProductsStore } from '../../../../shared/stores/product-list.store';
import { ProductsStore } from '../../../../shared/stores/products.store';
import { RegionsStore } from '../../../../shared/stores/regions.store';
import { ProductGallery } from '../../components/product-gallery/product-gallery';
import { ProductGrid } from '../../components/product-grid/product-grid';
import { swatchColor } from '../../option-swatch';
import { formatOriginalPrice, formatPrice, getProductPrice, getVariantPrice } from '../../product-price';
import {
  COLOR_OPTION_TITLE,
  SIZE_OPTION_TITLE,
  findVariant,
  isSizeAvailable,
  optionValues,
} from '../../product-variant';

/** How many related products the "You may also like" row shows. */
const RELATED_PRODUCTS_COUNT = 4;

/**
 * The product detail screen, ported from the Vue storefront's
 * `ProductScreen` + `useProductPage`: the product, the visitor's
 * color/size/quantity picks, the variant and price those resolve to,
 * "you may also like" suggestions, and add-to-cart.
 *
 * Like `ProductsScreen`, it's server-rendered with its data: the stores
 * hand the server's state to the browser (`withTransferState`), so
 * hydration starts from the same product the HTML shows.
 */
@Component({
  selector: 'app-product-screen',
  imports: [
    OkklyAccordion,
    OkklyAccordionDetails,
    OkklyAccordionSummary,
    OkklyAlert,
    OkklyAlertAction,
    OkklyBreadcrumbs,
    OkklyButton,
    OkklyButtonEndIcon,
    OkklyButtonStartIcon,
    OkklyIcon,
    OkklySkeleton,
    OkklyTypography,
    ProductGallery,
    ProductGrid,
    QuantityStepper,
  ],
  providers: [RelatedProductsStore],
  templateUrl: './product-screen.html',
  styleUrl: './product-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductScreen {
  private readonly router = inject(Router);
  private readonly regions = inject(RegionsStore);
  private readonly products = inject(ProductsStore);
  private readonly related = inject(RelatedProductsStore);
  private readonly cart = inject(CartStore);

  protected readonly iconArrowRight = iconArrowRight;
  protected readonly iconRefreshCw = iconRefreshCw;
  protected readonly swatchColor = swatchColor;

  private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  private readonly productId = computed(() => this.params().get('id') ?? '');

  private readonly regionId = computed(() => this.regions.defaultRegion()?.id);
  private readonly hasNoRegion = computed(
    () => this.regions.regions() !== null && this.regionId() === undefined,
  );

  protected readonly product = computed(() => this.products.getById(this.productId()) ?? null);

  protected readonly error = computed(() => this.regions.error() ?? this.products.error());
  protected readonly isError = computed(() => this.error() !== null);
  protected readonly isPending = computed(
    () => !this.isError() && !this.hasNoRegion() && this.product() === null,
  );

  protected readonly breadcrumbs = computed(() => {
    const product = this.product();
    return product ? [{ label: 'All products', href: '/' }, { label: product.title }] : [];
  });

  protected readonly eyebrow = computed(
    () => this.product()?.collection?.title ?? this.product()?.type?.value ?? null,
  );

  protected readonly colorOptions = computed(() => optionValues(this.product(), COLOR_OPTION_TITLE));
  protected readonly sizeOptions = computed(() => optionValues(this.product(), SIZE_OPTION_TITLE));

  /**
   * Picks default to each option's first value and reset when a different
   * product is shown — the component is reused across `/products/:id`, and
   * the previous product's picks don't apply to the next one's options.
   * Keyed on the id, not the product object, so a refetch keeps the picks.
   */
  private readonly productKey = computed(() => this.product()?.id ?? null);
  protected readonly selectedColor = linkedSignal({
    source: this.productKey,
    computation: () => untracked(this.colorOptions)[0]?.value ?? null,
  });
  protected readonly selectedSize = linkedSignal({
    source: this.productKey,
    computation: () => untracked(this.sizeOptions)[0]?.value ?? null,
  });

  protected readonly quantity = signal(1);

  private readonly selectedVariant = computed(() =>
    findVariant(this.product(), this.selectedColor(), this.selectedSize()),
  );

  private readonly price = computed(() => {
    const variant = this.selectedVariant();
    if (variant) return getVariantPrice(variant);

    const product = this.product();
    return product ? getProductPrice(product) : null;
  });

  protected readonly formattedPrice = computed(() => {
    const price = this.price();
    return price === null ? null : formatPrice(price);
  });

  protected readonly formattedOriginalPrice = computed(() => {
    const price = this.price();
    return price === null ? null : formatOriginalPrice(price);
  });

  protected readonly canAddToCart = computed(
    () => this.selectedVariant() !== null && this.regionId() !== undefined,
  );

  protected readonly addToCartIsPending = computed(() => {
    const variant = this.selectedVariant();
    return variant !== null && this.cart.isAdding(variant.id);
  });

  protected readonly relatedProducts = computed(() =>
    this.related
      .products()
      .filter((candidate) => candidate.id !== this.productId())
      .slice(0, RELATED_PRODUCTS_COUNT),
  );

  protected readonly detailsText = computed(() => {
    const product = this.product();
    const parts: string[] = [];

    if (product?.material) parts.push(`Material: ${product.material}`);
    if (product?.weight) parts.push(`Weight: ${product.weight}g`);

    return parts.length > 0
      ? parts.join(' · ')
      : 'No additional care details are listed for this product yet.';
  });

  constructor() {
    this.regions.load();

    effect(() => {
      const regionId = this.regionId();
      const id = this.productId();

      // Only `regionId`/`productId` should re-run this — not the signals the
      // stores read internally while handling the calls.
      if (regionId !== undefined) {
        untracked(() => {
          this.products.loadById({ id, regionId });
          this.related.load({ page: 1, regionId });
        });
      }
    });
  }

  protected isSizeAvailable(size: string): boolean {
    return isSizeAvailable(this.product(), this.selectedColor(), size);
  }

  protected refetch(): void {
    // A failed region request leaves nothing to price the product with, so
    // retrying the product alone would do nothing.
    if (this.regions.error() !== null) {
      this.regions.refresh();
      return;
    }

    const regionId = this.regionId();
    if (regionId !== undefined) {
      this.products.refreshById({ id: this.productId(), regionId });
    }
  }

  protected addToCart(): void {
    const variant = this.selectedVariant();
    const regionId = this.regionId();
    if (!variant || regionId === undefined) return;

    void this.cart.addItem({ variantId: variant.id, quantity: this.quantity(), regionId });
  }

  /**
   * `okkly-breadcrumbs` renders plain `<a href>`s, which would reload the
   * whole app (and every store) — route the in-app ones instead, keeping
   * modified clicks (new tab/window) native.
   */
  protected onBreadcrumbClick(event: MouseEvent): void {
    const link = (event.target as Element | null)?.closest('a');
    const href = link?.getAttribute('href');

    if (!href || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void this.router.navigateByUrl(href);
  }
}
