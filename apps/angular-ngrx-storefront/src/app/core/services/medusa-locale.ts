import { Service, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { readCookie } from './cookie.util';

const LOCALE_COOKIE_NAME = '_medusa_locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * The storefront's locale preference, persisted in a cookie so it survives
 * navigation and is already known on the very first SSR render.
 *
 * Reads are isomorphic (browser: `document.cookie`, server: the incoming
 * request's `Cookie` header via the `REQUEST` DI token). Writes only happen
 * in the browser — Angular has no response object to attach a `Set-Cookie`
 * to during SSR, so a server-side locale change won't persist until the
 * next client-side write.
 */
@Service()
export class MedusaLocaleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });

  readonly locale = signal<string | null>(this.readInitialLocale());

  set(locale: string): void {
    this.locale.set(locale);

    if (isPlatformBrowser(this.platformId)) {
      document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=strict`;
    }
  }

  private readInitialLocale(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return readCookie(document.cookie, LOCALE_COOKIE_NAME);
    }

    return readCookie(this.request?.headers.get('cookie') ?? '', LOCALE_COOKIE_NAME);
  }
}
