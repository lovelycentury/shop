import { PendingTasks, Service, inject, isDevMode } from '@angular/core';
import Medusa, { type ClientHeaders, type FetchArgs, type FetchInput } from '@medusajs/js-sdk';
import { environment } from '../../../environment';
import { MedusaLocaleService } from './medusa-locale';

const LOCALE_HEADER_NAME = 'x-medusa-locale';

/**
 * Builds the SDK, stamping every request with the locale read fresh on each
 * call. Every request is also a pending task: the SDK calls the global
 * `fetch`, which Angular knows nothing about, so without it SSR would
 * serialize the page before any response has landed.
 */
const createMedusaSdk = (): Medusa => {
  const localeService = inject(MedusaLocaleService);
  const pendingTasks = inject(PendingTasks);

  const sdk = new Medusa({
    baseUrl: environment.medusaBackendUrl,
    publishableKey: environment.medusaPublishableKey,
    debug: isDevMode(),
  });

  const originalFetch = sdk.client.fetch.bind(sdk.client);

  sdk.client.fetch = (<T>(input: FetchInput, init?: FetchArgs): Promise<T> => {
    const headers: ClientHeaders = { ...init?.headers };
    headers[LOCALE_HEADER_NAME] ??= localeService.locale();

    const removeTask = pendingTasks.add();
    return originalFetch<T>(input, { ...init, headers }).finally(removeTask);
  }) as typeof sdk.client.fetch;

  return sdk;
};

/**
 * App-wide Medusa SDK instance — `inject(MedusaSdk)` returns what the
 * factory builds, created once, the first time it's injected.
 *
 * The class is only a DI token: it's never instantiated (the factory does
 * the `new`). A decorator can't change a class's type, so the interface of
 * the same name merges `Medusa`'s members into it — without that,
 * `inject(MedusaSdk)` would be typed as this empty class. Not `extends
 * Medusa`: that would inherit Medusa's `constructor(config)`, and a
 * `@Service` class may not have constructor parameters.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface MedusaSdk extends Medusa {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
@Service({ factory: createMedusaSdk })
export abstract class MedusaSdk {}

export const injectMedusaSdk = (): Medusa => inject(MedusaSdk);
