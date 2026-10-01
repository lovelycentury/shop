import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MedusaSdk } from '../core/services/medusa-sdk';
import { provideAppState } from './app.state';

export const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The real store, reducers and effects against a fake SDK - the specs
 * dispatch the same actions the components do and read through the same
 * selectors, so they cover the whole action -> effect -> reducer round trip.
 */
export function setupState(sdk: Record<string, unknown>, providers: Provider[] = []) {
  TestBed.configureTestingModule({
    providers: [provideAppState(), { provide: MedusaSdk, useValue: { store: sdk } }, ...providers],
  });

  const store = TestBed.inject(Store);

  return {
    store,
    actions$: TestBed.inject(Actions),
    /** The selector's current value. */
    read: <T>(selector: (state: object) => T): T => store.selectSignal(selector)(),
  };
}
