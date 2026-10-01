import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, filter, from, map, of, switchMap } from 'rxjs';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { PaymentProvidersActions, PaymentProvidersApiActions } from './payment-providers.actions';
import { paymentProvidersFeature } from './payment-providers.reducer';

/** Only one request is ever in flight: both `load` and `refresh` are ignored while `loading` is true. */
@Injectable()
export class PaymentProvidersEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PaymentProvidersActions.load),
      concatLatestFrom(() =>
        this.store.select(paymentProvidersFeature.selectPaymentProvidersState),
      ),
      filter(([{ regionId }, state]) => !state.loading && regionId !== state.regionId),
      map(([{ regionId }]) => PaymentProvidersApiActions.fetchStarted({ regionId })),
    ),
  );

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PaymentProvidersActions.refresh),
      concatLatestFrom(() => this.store.select(paymentProvidersFeature.selectLoading)),
      filter(([, loading]) => !loading),
      map(([{ regionId }]) => PaymentProvidersApiActions.fetchStarted({ regionId })),
    ),
  );

  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PaymentProvidersApiActions.fetchStarted),
      switchMap(({ regionId }) =>
        from(this.sdk.store.payment.listPaymentProviders({ region_id: regionId })).pipe(
          map(({ payment_providers }) =>
            PaymentProvidersApiActions.fetchSucceeded({
              paymentProviders: payment_providers,
              regionId,
            }),
          ),
          catchError((error: unknown) =>
            of(PaymentProvidersApiActions.fetchFailed({ error: String(error) })),
          ),
        ),
      ),
    ),
  );
}
