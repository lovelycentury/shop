import { patchState, signalStore, withMethods, withState } from "@ngrx/signals"
import {
  setAllEntities,
  upsertEntity,
  withEntities,
} from "@ngrx/signals/entities"
import { rxMethod } from "@ngrx/signals/rxjs-interop"
import { tapResponse } from "@ngrx/operators"
import { filter, from, mergeMap, pipe, switchMap, tap } from "rxjs"
import type { HttpTypes } from "@medusajs/types"
import { injectMedusaSdk } from "../../core/services/medusa-sdk"

type ProductsState = {
  loading: boolean
  error: string | null
  pendingIds: string[]
}

const initialState: ProductsState = {
  loading: false,
  error: null,
  pendingIds: [],
}

const removePendingId = (id: string) => (state: ProductsState) => ({
  pendingIds: state.pendingIds.filter((pendingId) => pendingId !== id),
})

/**
 * Singleton store (one instance app-wide via `providedIn: 'root'`), so any
 * number of components reading `entityMap`/`entities`/`loading` share the
 * same state. Products are keyed by id in `entityMap` (via
 * `withEntities`), so looking up a single product never needs to scan
 * the whole list.
 *
 * `loadAll` no-ops once the list is loaded or already in flight, so
 * calling it from multiple independent components still fires a single
 * network request. `loadById` no-ops per id once that product is cached.
 */
export const ProductsStore = signalStore(
  { providedIn: "root" },
  withState(initialState),
  withEntities<HttpTypes.StoreProduct>(),
  withMethods((store) => {
    const sdk = injectMedusaSdk()

    const fetchAndStore = (id: string) =>
      from(sdk.store.product.retrieve(id)).pipe(
        tapResponse({
          next: ({ product }) =>
            patchState(store, upsertEntity(product), removePendingId(id)),
          error: (error: unknown) =>
            patchState(store, { error: String(error) }, removePendingId(id)),
        })
      )

    return {
      loadAll: rxMethod<void>(
        pipe(
          filter(() => !store.loading() && store.ids().length === 0),
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            from(sdk.store.product.list()).pipe(
              tapResponse({
                next: ({ products }) =>
                  patchState(store, setAllEntities(products), {
                    loading: false,
                  }),
                error: (error: unknown) =>
                  patchState(store, { loading: false, error: String(error) }),
              })
            )
          )
        )
      ),

      /**
       * `mergeMap`, not `switchMap` — unlike `loadAll` (a single logical
       * request), `loadById` can be called for *different* ids back to
       * back (two product pages mounting around the same time). `switchMap`
       * would cancel the first id's request as soon as the second comes in;
       * `mergeMap` lets independent id requests run concurrently.
       */
      loadById: rxMethod<string>(
        pipe(
          filter(
            (id) => !store.entityMap()[id] && !store.pendingIds().includes(id)
          ),
          tap((id) =>
            patchState(store, (s) => ({ pendingIds: [...s.pendingIds, id] }))
          ),
          mergeMap(fetchAndStore)
        )
      ),

      /**
       * Like `loadById`, but skips the "already cached" check — use this
       * when you explicitly want fresh data for a product that's already
       * in `entityMap` (e.g. a manual "refresh" button). Still guarded
       * against duplicate *concurrent* calls for the same id via
       * `pendingIds`, shared with `loadById`.
       */
      refreshById: rxMethod<string>(
        pipe(
          filter((id) => !store.pendingIds().includes(id)),
          tap((id) =>
            patchState(store, (s) => ({ pendingIds: [...s.pendingIds, id] }))
          ),
          mergeMap(fetchAndStore)
        )
      ),

      getById(id: string): HttpTypes.StoreProduct | undefined {
        return store.entityMap()[id]
      },

      getAll(): HttpTypes.StoreProduct[] {
        return store.entities()
      },
    }
  })
)
