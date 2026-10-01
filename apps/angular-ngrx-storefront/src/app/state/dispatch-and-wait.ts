import { Actions, ofType } from '@ngrx/effects';
import type { Action, ActionCreator, Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

/**
 * Dispatches `action` and resolves with whichever of `results` comes back
 * first - for the few callers (a checkout step's submit) that must know the
 * outcome before moving on.
 *
 * Subscribes before dispatching: an effect can answer synchronously, and a
 * result dispatched before the subscription would be missed for good.
 *
 * Results aren't correlated to the request that caused them, so this relies
 * on only one such request being in flight at a time - which the cart's
 * `loading` guard (`mutationBlocked`) already ensures.
 */
export function dispatchAndWait<const Results extends readonly ActionCreator[]>(
  store: Store,
  actions$: Actions,
  action: Action,
  results: Results,
): Promise<ReturnType<Results[number]>> {
  const result = firstValueFrom(actions$.pipe(ofType(...results)));
  store.dispatch(action);
  return result as Promise<ReturnType<Results[number]>>;
}
