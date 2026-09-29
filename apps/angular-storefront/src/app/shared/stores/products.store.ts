import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, upsertEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, from, mergeMap, pipe, tap } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { withTransferState } from './with-transfer-state';

export type ProductQuery = {
  id: string;
  regionId: string;
};

type ProductsState = {
  /** The region every cached product was priced for. */
  regionId: string | null;
  error: string | null;
  pendingIds: string[];
};

const initialState: ProductsState = {
  regionId: null,
  error: null,
  pendingIds: [],
};

/**
 * Everything the product page needs in one request - prices, the variants'
 * option values (to pick a variant) and the gallery images. Ported from the
 * Vue storefront's `useProductPage`.
 */
const PRODUCT_FIELDS = '*variants.calculated_price,*variants.options,*options.values,*images';

const removePendingId = (id: string) => (state: ProductsState) => ({
  pendingIds: state.pendingIds.filter((pendingId) => pendingId !== id),
});

/**
 * Fully loaded products by id, priced for one region - what the product page
 * reads. Paged catalogue listings live in `ProductListStore`: those items are
 * fetched with list-only fields, so they never go in here, or a product page
 * would take a partial list item for a fully loaded product.
 *
 * Prices depend on the region, so the cache belongs to one region at a time:
 * asking for a different region drops everything cached for the old one.
 */
export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<HttpTypes.StoreProduct>(),
  withMethods((store) => {
    const sdk = injectMedusaSdk();

    const switchRegionIfNeeded = ({ regionId }: ProductQuery) => {
      if (regionId !== store.regionId()) {
        patchState(store, removeAllEntities(), { regionId, pendingIds: [] });
      }
    };

    const markPending = ({ id }: ProductQuery) =>
      patchState(store, (s) => ({ pendingIds: [...s.pendingIds, id], error: null }));

    const fetchProduct = ({ id, regionId }: ProductQuery) =>
      from(sdk.store.product.retrieve(id, { fields: PRODUCT_FIELDS, region_id: regionId })).pipe(
        tapResponse({
          next: ({ product }) => {
            // A region switch while this was in flight means it's priced
            // for a region we no longer show.
            if (store.regionId() === regionId) {
              patchState(store, upsertEntity(product), removePendingId(id));
            }
          },
          error: (error: unknown) => patchState(store, { error: String(error) }, removePendingId(id)),
        }),
      );

    return {
      /**
       * Skips the request if the product is cached or already in flight.
       * `mergeMap`, not `switchMap`: requests for *different* ids are
       * independent and must not cancel each other.
       */
      loadById: rxMethod<ProductQuery>(
        pipe(
          tap(switchRegionIfNeeded),
          filter(({ id }) => !store.entityMap()[id] && !store.pendingIds().includes(id)),
          tap(markPending),
          mergeMap(fetchProduct),
        ),
      ),

      /** Refetches even a cached product; still one request per id at a time. */
      refreshById: rxMethod<ProductQuery>(
        pipe(
          tap(switchRegionIfNeeded),
          filter(({ id }) => !store.pendingIds().includes(id)),
          tap(markPending),
          mergeMap(fetchProduct),
        ),
      ),

      getById(id: string): HttpTypes.StoreProduct | undefined {
        return store.entityMap()[id];
      },

      isLoading(id: string): boolean {
        return store.pendingIds().includes(id);
      },
    };
  }),
  withTransferState('products'),
);
