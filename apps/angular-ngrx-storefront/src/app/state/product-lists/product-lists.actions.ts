import { createActionGroup, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';

/**
 * Which listing an action is about. One global store has no per-component
 * instances, so the catalogue page and the product page's "You may also
 * like" row are two keys of one feature: loading the related row must never
 * replace the page the catalogue has on screen.
 */
export type ProductListKey = 'catalogue' | 'related';

export type ProductListQuery = {
  page: number;
  regionId: string;
};

export const ProductListsActions = createActionGroup({
  source: 'Product Lists',
  events: {
    /**
     * Skips the request if this exact page is already on screen or already
     * in flight. Compared against the latest *requested* page, not the loaded
     * one: going 1 -> 2 -> back to 1 before 2 lands must still fetch 1, or
     * page 2's late response would win.
     */
    Load: props<{ key: ProductListKey; query: ProductListQuery }>(),
    /** Refetches the given page even if it is already on screen. */
    Refresh: props<{ key: ProductListKey; query: ProductListQuery }>(),
  },
});

export const ProductListsApiActions = createActionGroup({
  source: 'Product Lists API',
  events: {
    'Fetch Started': props<{ key: ProductListKey; query: ProductListQuery }>(),
    'Fetch Succeeded': props<{
      key: ProductListKey;
      query: ProductListQuery;
      products: HttpTypes.StoreProduct[];
      count: number;
    }>(),
    'Fetch Failed': props<{ key: ProductListKey; error: string }>(),
  },
});
