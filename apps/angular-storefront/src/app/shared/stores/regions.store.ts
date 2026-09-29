import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { filter, from, pipe, switchMap, tap } from 'rxjs';
import type { HttpTypes } from '@medusajs/types';
import { injectMedusaSdk } from '../../core';
import { withTransferState } from './with-transfer-state';

type RegionsState = {
  regions: HttpTypes.StoreRegion[] | null;
  loading: boolean;
  error: string | null;
};

const initialState: RegionsState = {
  regions: null,
  loading: false,
  error: null,
};

/**
 * The store's regions, shared across features: a region is the pricing
 * context of other Store API calls (products need it for
 * `calculated_price`, `CartStore.addItem` needs a `regionId`, checkout
 * needs its countries). Ported from the Vue storefront's `useRegions`.
 *
 * Only one request is ever in flight: both `load` and `refresh` are
 * ignored while `loading` is true.
 */
export const RegionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ regions }) => {
    const defaultRegion = computed(() => regions()?.[0] ?? null);

    return {
      defaultRegion,
      countries: computed(() => defaultRegion()?.countries ?? []),
    };
  }),
  withMethods((store) => {
    const sdk = injectMedusaSdk();

    const fetchRegions = () =>
      from(sdk.store.region.list({ fields: '*countries' })).pipe(
        tapResponse({
          next: ({ regions }) => patchState(store, { regions, loading: false }),
          error: (error: unknown) => patchState(store, { loading: false, error: String(error) }),
        }),
      );

    return {
      /**
       * Regions change about as often as the store is reconfigured, so
       * they're loaded once per app lifetime (the Vue version's
       * `staleTime: Infinity`) — skipped once loaded.
       */
      load: rxMethod<void>(
        pipe(
          filter(() => !store.loading() && store.regions() === null),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(fetchRegions),
        ),
      ),

      /** Refetches even when regions are already loaded. */
      refresh: rxMethod<void>(
        pipe(
          filter(() => !store.loading()),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(fetchRegions),
        ),
      ),

      getAll(): HttpTypes.StoreRegion[] {
        return store.regions() ?? [];
      },

      getById(id: string): HttpTypes.StoreRegion | undefined {
        return store.regions()?.find((region) => region.id === id);
      },
    };
  }),
  withTransferState('regions'),
);
