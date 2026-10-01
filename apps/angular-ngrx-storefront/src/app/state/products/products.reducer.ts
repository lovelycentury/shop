import { type EntityState, createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import type { AppError } from '../../core/models/app-error';
import { type ProductQuery, ProductsActions, ProductsApiActions } from './products.actions';

export type ProductsState = EntityState<HttpTypes.StoreProduct> & {
  /** The region every cached product was priced for. */
  regionId: string | null;
  error: AppError | null;
  pendingIds: string[];
};

const adapter = createEntityAdapter<HttpTypes.StoreProduct>();

export const initialProductsState: ProductsState = adapter.getInitialState({
  regionId: null,
  error: null,
  pendingIds: [],
});

const withoutPendingId = (state: ProductsState, id: string): string[] =>
  state.pendingIds.filter((pendingId) => pendingId !== id);

/**
 * Prices depend on the region, so the cache belongs to one region at a
 * time: asking for a different region drops everything cached for the old
 * one. Handled on the UI's action itself, so the effect's "already cached?"
 * check already sees the switched cache.
 */
const switchRegionIfNeeded = (state: ProductsState, { regionId }: ProductQuery): ProductsState =>
  regionId === state.regionId ? state : adapter.removeAll({ ...state, regionId, pendingIds: [] });

/**
 * Fully loaded products by id, priced for one region - what the product page
 * reads. Paged catalogue listings live in the `productLists` feature: those
 * items are fetched with list-only fields, so they never go in here, or a
 * product page would take a partial list item for a fully loaded product.
 */
export const productsFeature = createFeature({
  name: 'products',
  reducer: createReducer(
    initialProductsState,
    on(ProductsActions.loadById, ProductsActions.refreshById, switchRegionIfNeeded),
    on(ProductsApiActions.fetchStarted, (state, { id }): ProductsState => ({
      ...state,
      pendingIds: [...state.pendingIds, id],
      error: null,
    })),
    on(ProductsApiActions.fetchSucceeded, (state, { product, regionId }): ProductsState =>
      // A region switch while this was in flight means it's priced for a
      // region we no longer show.
      regionId === state.regionId
        ? adapter.upsertOne(product, { ...state, pendingIds: withoutPendingId(state, product.id) })
        : state,
    ),
    on(ProductsApiActions.fetchFailed, (state, { id, error }): ProductsState => ({
      ...state,
      error,
      pendingIds: withoutPendingId(state, id),
    })),
  ),
  extraSelectors: ({ selectProductsState }) => adapter.getSelectors(selectProductsState),
});
