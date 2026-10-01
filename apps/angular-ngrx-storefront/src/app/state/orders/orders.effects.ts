import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, filter, from, map, mergeMap, of } from 'rxjs';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { OrdersActions, OrdersApiActions } from './orders.actions';
import { ordersFeature } from './orders.reducer';

@Injectable()
export class OrdersEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();

  readonly loadById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.loadById),
      concatLatestFrom(() => this.store.select(ordersFeature.selectOrdersState)),
      filter(([{ id }, state]) => !state.entities[id] && !state.pendingIds.includes(id)),
      map(([{ id }]) => OrdersApiActions.fetchStarted({ id })),
    ),
  );

  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersApiActions.fetchStarted),
      mergeMap(({ id }) =>
        from(this.sdk.store.order.retrieve(id)).pipe(
          map(({ order }) => OrdersApiActions.fetchSucceeded({ order })),
          catchError((error: unknown) =>
            of(OrdersApiActions.fetchFailed({ id, error: String(error) })),
          ),
        ),
      ),
    ),
  );
}
