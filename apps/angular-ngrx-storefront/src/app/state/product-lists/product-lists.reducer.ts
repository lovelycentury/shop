import { createFeature, createReducer, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import {
  type ProductListKey,
  type ProductListQuery,
  ProductListsApiActions,
} from './product-lists.actions';

export type ProductListState = {
  products: HttpTypes.StoreProduct[];
  /** Total across all pages, for the pagination. */
  count: number;
  /** The query the current `products` belong to (set on success only). */
  query: ProductListQuery | null;
  /** The latest query asked for - equals `query` once it has landed. */
  requested: ProductListQuery | null;
  loading: boolean;
  error: string | null;
};

export type ProductListsState = Record<ProductListKey, ProductListState>;

const initialProductListState: ProductListState = {
  products: [],
  count: 0,
  query: null,
  requested: null,
  loading: false,
  error: null,
};

export const initialProductListsState: ProductListsState = {
  catalogue: initialProductListState,
  related: initialProductListState,
};

const updateList = (
  state: ProductListsState,
  key: ProductListKey,
  update: (list: ProductListState) => Partial<ProductListState>,
): ProductListsState => ({ ...state, [key]: { ...state[key], ...update(state[key]) } });

/**
 * Priced pages of the catalogue, ported from the Vue storefront's
 * `useProducts`. Kept apart from the `products` feature's by-id cache on
 * purpose: list items are fetched with list-specific fields, so caching them
 * there would let a product page mistake a partial list item for a fully
 * loaded product.
 *
 * While the next page loads, the previous page's `products` stay in state
 * (the Vue version's placeholder data) - `selectStale` tells the grid to dim
 * them.
 */
export const productListsFeature = createFeature({
  name: 'productLists',
  reducer: createReducer(
    initialProductListsState,
    on(ProductListsApiActions.fetchStarted, (state, { key, query }) =>
      updateList(state, key, () => ({ requested: query, loading: true, error: null })),
    ),
    on(ProductListsApiActions.fetchSucceeded, (state, { key, query, products, count }) =>
      updateList(state, key, () => ({ products, count, query, loading: false })),
    ),
    // Roll `requested` back so `load` will retry this page.
    on(ProductListsApiActions.fetchFailed, (state, { key, error }) =>
      updateList(state, key, (list) => ({ requested: list.query, loading: false, error })),
    ),
  ),
});
