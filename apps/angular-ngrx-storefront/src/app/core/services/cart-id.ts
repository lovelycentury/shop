import { Service, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { readCookie } from './cookie.util';

const CART_ID_COOKIE_NAME = 'cart_id';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

/**
 * The current visitor's cart id, persisted in a cookie so it survives
 * reloads/navigation and is known on the very first SSR render — same
 * isomorphic read pattern as `MedusaLocaleService`. The cart itself is
 * created lazily on the first "add to cart" (see `CartEffects.addItem$`),
 * not on every page load, so this starts out `null` for most visitors.
 */
@Service()
export class CartIdService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });

  readonly cartId = signal<string | null>(this.readInitialCartId());

  set(cartId: string): void {
    this.cartId.set(cartId);

    if (isPlatformBrowser(this.platformId)) {
      document.cookie = `${CART_ID_COOKIE_NAME}=${encodeURIComponent(cartId)}; path=/; max-age=${THIRTY_DAYS_SECONDS}; samesite=lax`;
    }
  }

  /** Called after an order is placed — the completed cart's id is no longer useful. */
  clear(): void {
    this.cartId.set(null);

    if (isPlatformBrowser(this.platformId)) {
      document.cookie = `${CART_ID_COOKIE_NAME}=; path=/; max-age=0`;
    }
  }

  private readInitialCartId(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return readCookie(document.cookie, CART_ID_COOKIE_NAME);
    }

    return readCookie(this.request?.headers.get('cookie') ?? '', CART_ID_COOKIE_NAME);
  }
}
