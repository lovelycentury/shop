import { InjectionToken, inject, isDevMode } from '@angular/core';
import Medusa, { type ClientHeaders, type FetchArgs, type FetchInput } from '@medusajs/js-sdk';
import { environment } from '../../../environment';
import { MedusaLocaleService } from './medusa-locale';

const LOCALE_HEADER_NAME = 'x-medusa-locale';

/**
 * App-wide Medusa SDK instance, stamping every request with the current
 * locale (read fresh on each call, so a later locale change is picked up
 * without recreating the SDK).
 */
export const MEDUSA_SDK = new InjectionToken<Medusa>('MEDUSA_SDK', {
  providedIn: 'root',
  factory: () => {
    const localeService = inject(MedusaLocaleService);

    const sdk = new Medusa({
      baseUrl: environment.medusaBackendUrl,
      publishableKey: environment.medusaPublishableKey,
      debug: isDevMode(),
    });

    const originalFetch = sdk.client.fetch.bind(sdk.client);

    sdk.client.fetch = (<T>(input: FetchInput, init?: FetchArgs): Promise<T> => {
      const headers: ClientHeaders = { ...init?.headers };
      headers[LOCALE_HEADER_NAME] ??= localeService.locale();

      return originalFetch(input, { ...init, headers });
    }) as typeof sdk.client.fetch;

    return sdk;
  },
});

export const injectMedusaSdk = (): Medusa => inject(MEDUSA_SDK);
