import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  OkklyAlert,
  OkklyAlertAction,
  OkklyButton,
  OkklyButtonStartIcon,
  OkklyIcon,
  OkklyPagination,
  OkklyTypography,
} from '@okkly/angular';
import { iconPackage, iconRefreshCw } from '@okkly/icons';
import { ProductListStore, PRODUCTS_PAGE_SIZE } from '../../../../shared/stores/product-list.store';
import { RegionsStore } from '../../../../shared/stores/regions.store';
import { ProductGrid } from '../../components/product-grid/product-grid';

/** Why the grid has nothing to show, so the screen can say something useful. */
type ProductsEmptyReason = 'no-region' | 'past-end' | 'no-products';

const EMPTY_COPY: Record<ProductsEmptyReason, string> = {
  'no-region': 'The store has no region configured, so nothing can be priced.',
  'past-end': 'This page is past the end of the catalogue.',
  'no-products': 'This sales channel has no published products yet.',
};

const parsePage = (raw: string | null): number => {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/**
 * One page of the catalogue, ported from the Vue storefront's `ProductsScreen`
 * + `useProductsPage`.
 *
 * The page lives in `?page=` rather than in component state so a page of
 * results can be linked to, reloaded and reached again with the back button.
 * Page 1 leaves the param off entirely, keeping the canonical URL clean.
 *
 * Rendered with its data on the server: every SDK request is a pending
 * task SSR waits for, and the stores hand their state to the browser
 * (`withTransferState`), so hydration starts from the page the HTML shows
 * and the browser's `load` calls skip what's already there.
 */
@Component({
  selector: 'app-products-screen',
  imports: [
    OkklyAlert,
    OkklyAlertAction,
    OkklyButton,
    OkklyButtonStartIcon,
    OkklyIcon,
    OkklyPagination,
    OkklyTypography,
    ProductGrid,
  ],
  templateUrl: './products-screen.html',
  styleUrl: './products-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsScreen {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly regions = inject(RegionsStore);
  protected readonly list = inject(ProductListStore);
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');

  protected readonly pageSize = PRODUCTS_PAGE_SIZE;
  protected readonly iconPackage = iconPackage;
  protected readonly iconRefreshCw = iconRefreshCw;

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly page = computed(() => parsePage(this.queryParams().get('page')));

  private readonly regionId = computed(() => this.regions.defaultRegion()?.id);

  /** The store answered, but has no region at all - nothing can be priced. */
  private readonly hasNoRegion = computed(
    () => this.regions.regions() !== null && this.regionId() === undefined,
  );

  protected readonly error = computed(() => this.regions.error() ?? this.list.error());
  protected readonly isError = computed(() => this.error() !== null);

  /**
   * Skeletons until the first page has landed. Both ways the region can
   * fail to arrive - an error, or a store with no regions - break out of it,
   * or the screen would sit on skeletons for good.
   */
  protected readonly isPending = computed(
    () => !this.isError() && !this.hasNoRegion() && this.list.query() === null,
  );

  protected readonly emptyCopy = computed(() => {
    const reason: ProductsEmptyReason = this.hasNoRegion()
      ? 'no-region'
      : this.page() > 1
        ? 'past-end'
        : 'no-products';
    return { reason, text: EMPTY_COPY[reason] };
  });

  constructor() {
    inject(Meta).updateTag({ name: 'description', content: 'Browse the catalogue.' });

    this.regions.load();

    effect(() => {
      const regionId = this.regionId();
      const page = this.page();

      // Only `regionId`/`page` should re-run this - not the signals the
      // store reads internally while handling the call.
      if (regionId !== undefined) {
        untracked(() => this.list.load({ page, regionId }));
      }
    });
  }

  protected refetch(): void {
    // A failed region request leaves no region to price products with, so
    // retrying the products alone would do nothing.
    if (this.regions.error() !== null) {
      this.regions.refresh();
      return;
    }

    const regionId = this.regionId();
    if (regionId !== undefined) {
      this.list.refresh({ page: this.page(), regionId });
    }
  }

  protected goToPage(next: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: next === 1 ? null : next },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Paging swaps the content above the control that was just clicked, so
   * bring the top of the listing back into view.
   */
  protected onPageChange(next: number): void {
    this.goToPage(next);
    this.root().nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
