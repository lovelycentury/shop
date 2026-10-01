import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, filter, from, map, mergeMap, of } from 'rxjs';
import { toAppError } from '../../core/models/app-error';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { ProductsActions, ProductsApiActions } from './products.actions';
import { productsFeature } from './products.reducer';

/**
 * Everything the product page needs in one request - prices, the variants'
 * option values (to pick a variant) and the gallery images. Ported from the
 * Vue storefront's `useProductPage`.
 */
const PRODUCT_FIELDS = '*variants.calculated_price,*variants.options,*options.values,*images';

@Injectable()
export class ProductsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();

  readonly loadById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.loadById),
      concatLatestFrom(() => this.store.select(productsFeature.selectProductsState)),
      filter(([{ id }, state]) => !state.entities[id] && !state.pendingIds.includes(id)),
      map(([{ id, regionId }]) => ProductsApiActions.fetchStarted({ id, regionId })),
    ),
  );

  readonly refreshById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsActions.refreshById),
      concatLatestFrom(() => this.store.select(productsFeature.selectPendingIds)),
      filter(([{ id }, pendingIds]) => !pendingIds.includes(id)),
      map(([{ id, regionId }]) => ProductsApiActions.fetchStarted({ id, regionId })),
    ),
  );

  /** `mergeMap`, not `switchMap`: requests for *different* ids are independent and must not cancel each other. */
  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductsApiActions.fetchStarted),
      mergeMap(({ id, regionId }) =>
        from(
          this.sdk.store.product.retrieve(id, { fields: PRODUCT_FIELDS, region_id: regionId }),
        ).pipe(
          map(({ product }) => ProductsApiActions.fetchSucceeded({ product, regionId })),
          catchError((error: unknown) =>
            of(ProductsApiActions.fetchFailed({ id, error: toAppError(error) })),
          ),
        ),
      ),
    ),
  );
}
