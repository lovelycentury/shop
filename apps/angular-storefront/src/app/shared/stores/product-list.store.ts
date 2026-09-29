import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, from, pipe, switchMap, tap } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';

/** Cards per page - a multiple of 2, 3 and 4, so no grid row is left ragged. */
export const PRODUCTS_PAGE_SIZE = 12;

export type ProductListQuery = {
  page: number;
  regionId: string;
};

type ProductListState = {
  products: HttpTypes.StoreProduct[];
  /** Total across all pages, for the pagination. */
  count: number;
  /** The query the current `products` belong to (set on success only). */
  query: ProductListQuery | null;
  /** The latest query asked for — equals `query` once it has landed. */
  requested: ProductListQuery | null;
  loading: boolean;
  error: string | null;
};

const initialState: ProductListState = {
  products: [],
  count: 0,
  query: null,
  requested: null,
  loading: false,
  error: null,
};

const sameQuery = (a: ProductListQuery | null, b: ProductListQuery) =>
  a !== null && a.page === b.page && a.regionId === b.regionId;

/**
 * One priced page of the catalogue, ported from the Vue storefront's
 * `useProducts` as used by `useProductsPage`. Kept apart from
 * `ProductsStore`'s by-id cache on purpose: list items are fetched with
 * list-specific fields, so caching them there would let a product page
 * mistake a partial list item for a fully loaded product.
 *
 * While the next page loads, the previous page's `products` stay in state
 * (the Vue version's placeholder data) — `stale` tells the grid to dim them.
 *
 * `switchMap`, not a `loading` guard: paging must not be dropped while a
 * request is in flight (e.g. the back button changing `?page=`), so a newer
 * page cancels the older request instead.
 */
export const ProductListStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ count, loading, query }) => ({
    pageCount: computed(() => Math.max(1, Math.ceil(count() / PRODUCTS_PAGE_SIZE))),
    /** A newer page is loading over one already on screen. */
    stale: computed(() => loading() && query() !== null),
  })),
  withMethods((store) => {
    const sdk = injectMedusaSdk();

    const fetchPage = (query: ProductListQuery) =>
      from(
        sdk.store.product.list({
          limit: PRODUCTS_PAGE_SIZE,
          offset: (query.page - 1) * PRODUCTS_PAGE_SIZE,
          // Variants carry no price unless asked for explicitly, and only
          // ever relative to a region.
          fields: '*variants.calculated_price',
          region_id: query.regionId,
        }),
      ).pipe(
        tapResponse({
          next: ({ products, count }) => patchState(store, { products, count, query, loading: false }),
          // Roll `requested` back so `load` will retry this page.
          error: (error: unknown) =>
            patchState(store, (s) => ({ requested: s.query, loading: false, error: String(error) })),
        }),
      );

    return {
      /**
       * Skips the request if this exact page is already on screen or
       * already in flight. Compared against the latest *requested* page,
       * not the loaded one: going 1 → 2 → back to 1 before 2 lands must
       * still fetch 1, or page 2's late response would win.
       */
      load: rxMethod<ProductListQuery>(
        pipe(
          filter((query) => !sameQuery(store.requested(), query)),
          tap((query) => patchState(store, { requested: query, loading: true, error: null })),
          switchMap(fetchPage),
        ),
      ),

      /** Refetches the given page even if it is already on screen. */
      refresh: rxMethod<ProductListQuery>(
        pipe(
          tap((query) => patchState(store, { requested: query, loading: true, error: null })),
          switchMap(fetchPage),
        ),
      ),

      getAll(): HttpTypes.StoreProduct[] {
        return store.products();
      },
    };
  }),
);
