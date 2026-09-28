import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { upsertEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, from, mergeMap, pipe, tap } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { injectMedusaSdk } from '../../core';

type OrderState = {
  error: string | null;
  pendingIds: string[];
};

const initialState: OrderState = {
  error: null,
  pendingIds: [],
};

const removePendingId = (id: string) => (state: OrderState) => ({
  pendingIds: state.pendingIds.filter((pendingId) => pendingId !== id),
});

/**
 * Orders by id, ported from the Vue storefront's `useOrder`. The Store API
 * allows retrieving a single order without authentication (unlike listing
 * orders), which is what lets a guest checkout land on an order
 * status/confirmation page. Same keyed-cache + `pendingIds` dedup as
 * `ProductsStore.loadById`.
 */
export const OrderStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<HttpTypes.StoreOrder>(),
  withMethods((store) => {
    const sdk = injectMedusaSdk();

    return {
      loadById: rxMethod<string>(
        pipe(
          filter((id) => !store.entityMap()[id] && !store.pendingIds().includes(id)),
          tap((id) => patchState(store, (s) => ({ pendingIds: [...s.pendingIds, id], error: null }))),
          mergeMap((id) =>
            from(sdk.store.order.retrieve(id)).pipe(
              tapResponse({
                next: ({ order }) => patchState(store, upsertEntity(order), removePendingId(id)),
                error: (error: unknown) => patchState(store, { error: String(error) }, removePendingId(id)),
              }),
            ),
          ),
        ),
      ),

      getById(id: string): HttpTypes.StoreOrder | undefined {
        return store.entityMap()[id];
      },
    };
  }),
);
