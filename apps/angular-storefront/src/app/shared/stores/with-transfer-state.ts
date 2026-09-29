import { PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { getState, patchState, signalStoreFeature, withHooks } from '@ngrx/signals';

/**
 * Hands a store's server-rendered state over to the browser, so a
 * server-rendered page hydrates against the same data it was rendered with.
 *
 * The SDK's requests resolve asynchronously, so a browser store that
 * started empty and refetched would render skeletons over the server's
 * markup on its first pass - a hydration mismatch - and repeat every
 * request the server already made. Instead the server serializes the
 * store's final state into the page, and the browser store starts from it
 * (its `load` methods then skip what is already there).
 *
 * `key` must be unique per store *class*; two instances of one class in the
 * same render would overwrite each other's state.
 */
export function withTransferState(key: string) {
  return signalStoreFeature(
    withHooks({
      onInit(store) {
        const transferState = inject(TransferState);
        const stateKey = makeStateKey<object>(`store:${key}`);

        if (isPlatformServer(inject(PLATFORM_ID))) {
          transferState.onSerialize(stateKey, () => getState(store));
          return;
        }

        const state = transferState.get(stateKey, null);
        if (state !== null) {
          patchState(store, state);
          // Only the first render is server-rendered; a store created later
          // (e.g. navigating back to a screen) must not reuse it.
          transferState.remove(stateKey);
        }
      },
    }),
  );
}
