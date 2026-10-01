import { PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { type ActionReducer, INIT, type MetaReducer } from '@ngrx/store';
import type { AppState } from './app.state';

/** The slices a server render fills in; the rest (cart, checkout) is browser-only. */
const TRANSFERRED_SLICES = [
  'regions',
  'products',
  'productLists',
] as const satisfies (keyof AppState)[];

type TransferredState = Pick<AppState, (typeof TRANSFERRED_SLICES)[number]>;

const STATE_KEY = makeStateKey<TransferredState>('ngrx-state');

/**
 * Hands the server-rendered store state over to the browser, so a
 * server-rendered page hydrates against the same data it was rendered with.
 *
 * The SDK's requests resolve asynchronously, so a browser store that started
 * empty and refetched would render skeletons over the server's markup on its
 * first pass - a hydration mismatch - and repeat every request the server
 * already made. Instead the server serializes the final state into the page,
 * and the browser store starts from it on `INIT` (its `load` effects then
 * skip what is already there).
 *
 * A factory (`META_REDUCERS` with `useFactory`) rather than a plain
 * meta-reducer, because it needs `TransferState` from DI.
 */
export function transferStateMetaReducer(): MetaReducer<AppState> {
  const transferState = inject(TransferState);
  const isServer = isPlatformServer(inject(PLATFORM_ID));

  return (reducer: ActionReducer<AppState>): ActionReducer<AppState> => {
    let latest: AppState | undefined;

    if (isServer) {
      transferState.onSerialize(STATE_KEY, () => {
        const state = latest as AppState;
        return Object.fromEntries(
          TRANSFERRED_SLICES.map((key) => [key, state[key]]),
        ) as TransferredState;
      });
    }

    return (state, action) => {
      if (!isServer && action.type === INIT) {
        const transferred = transferState.get(STATE_KEY, null);

        if (transferred !== null) {
          // Only the first render is server-rendered; nothing later may reuse it.
          transferState.remove(STATE_KEY);
          state = { ...state, ...transferred } as AppState;
        }
      }

      latest = reducer(state, action);
      return latest;
    };
  };
}
