import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, filter, from, map, of, switchMap } from 'rxjs';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { ShippingOptionsActions, ShippingOptionsApiActions } from './shipping-options.actions';
import { shippingOptionsFeature } from './shipping-options.reducer';

/** Only one request is ever in flight: both `load` and `refresh` are ignored while `loading` is true. */
@Injectable()
export class ShippingOptionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingOptionsActions.load),
      concatLatestFrom(() => this.store.select(shippingOptionsFeature.selectShippingOptionsState)),
      filter(([{ cartId }, state]) => !state.loading && cartId !== state.cartId),
      map(([{ cartId }]) => ShippingOptionsApiActions.fetchStarted({ cartId })),
    ),
  );

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingOptionsActions.refresh),
      concatLatestFrom(() => this.store.select(shippingOptionsFeature.selectLoading)),
      filter(([, loading]) => !loading),
      map(([{ cartId }]) => ShippingOptionsApiActions.fetchStarted({ cartId })),
    ),
  );

  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingOptionsApiActions.fetchStarted),
      switchMap(({ cartId }) =>
        from(this.sdk.store.fulfillment.listCartOptions({ cart_id: cartId })).pipe(
          map(({ shipping_options }) =>
            ShippingOptionsApiActions.fetchSucceeded({
              shippingOptions: shipping_options,
              cartId,
            }),
          ),
          catchError((error: unknown) =>
            of(ShippingOptionsApiActions.fetchFailed({ error: String(error) })),
          ),
        ),
      ),
    ),
  );
}
