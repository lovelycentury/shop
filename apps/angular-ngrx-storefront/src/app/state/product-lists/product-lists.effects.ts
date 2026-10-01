import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, filter, from, groupBy, map, mergeMap, of, switchMap } from 'rxjs';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import {
  type ProductListQuery,
  ProductListsActions,
  ProductListsApiActions,
} from './product-lists.actions';
import { productListsFeature } from './product-lists.reducer';
import { PRODUCTS_PAGE_SIZE } from './product-lists.selectors';

const sameQuery = (a: ProductListQuery | null, b: ProductListQuery) =>
  a !== null && a.page === b.page && a.regionId === b.regionId;

@Injectable()
export class ProductListsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductListsActions.load),
      concatLatestFrom(() => this.store.select(productListsFeature.selectProductListsState)),
      filter(([{ key, query }, state]) => !sameQuery(state[key].requested, query)),
      map(([{ key, query }]) => ProductListsApiActions.fetchStarted({ key, query })),
    ),
  );

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductListsActions.refresh),
      map(({ key, query }) => ProductListsApiActions.fetchStarted({ key, query })),
    ),
  );

  /**
   * `switchMap`, not a `loading` guard: paging must not be dropped while a
   * request is in flight (e.g. the back button changing `?page=`), so a newer
   * page cancels the older request instead. Grouped by list first, so a
   * newer page of one listing never cancels the other listing's request.
   */
  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductListsApiActions.fetchStarted),
      groupBy(({ key }) => key),
      mergeMap((byKey$) =>
        byKey$.pipe(
          switchMap(({ key, query }) =>
            from(
              this.sdk.store.product.list({
                limit: PRODUCTS_PAGE_SIZE,
                offset: (query.page - 1) * PRODUCTS_PAGE_SIZE,
                // Variants carry no price unless asked for explicitly, and
                // only ever relative to a region.
                fields: '*variants.calculated_price',
                region_id: query.regionId,
              }),
            ).pipe(
              map(({ products, count }) =>
                ProductListsApiActions.fetchSucceeded({ key, query, products, count }),
              ),
              catchError((error: unknown) =>
                of(ProductListsApiActions.fetchFailed({ key, error: String(error) })),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
