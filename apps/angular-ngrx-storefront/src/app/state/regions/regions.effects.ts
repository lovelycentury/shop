import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, filter, from, map, of, switchMap } from 'rxjs';
import { injectMedusaSdk } from '../../core/services/medusa-sdk';
import { RegionsActions, RegionsApiActions } from './regions.actions';
import { regionsFeature } from './regions.reducer';

/**
 * Only one request is ever in flight: both `load` and `refresh` are ignored
 * while `loading` is true. The guards read state *before* `fetchStarted`
 * lands, which is why the UI's action and the one that flips `loading` are
 * two different actions.
 */
@Injectable()
export class RegionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sdk = injectMedusaSdk();

  /**
   * Regions change about as often as the store is reconfigured, so they're
   * loaded once per app lifetime (the Vue version's `staleTime: Infinity`).
   */
  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegionsActions.load),
      concatLatestFrom(() => this.store.select(regionsFeature.selectRegionsState)),
      filter(([, state]) => !state.loading && state.regions === null),
      map(() => RegionsApiActions.fetchStarted()),
    ),
  );

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegionsActions.refresh),
      concatLatestFrom(() => this.store.select(regionsFeature.selectLoading)),
      filter(([, loading]) => !loading),
      map(() => RegionsApiActions.fetchStarted()),
    ),
  );

  readonly fetch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RegionsApiActions.fetchStarted),
      switchMap(() =>
        from(this.sdk.store.region.list({ fields: '*countries' })).pipe(
          map(({ regions }) => RegionsApiActions.fetchSucceeded({ regions })),
          catchError((error: unknown) =>
            of(RegionsApiActions.fetchFailed({ error: String(error) })),
          ),
        ),
      ),
    ),
  );
}
