import { FetchError } from '@medusajs/js-sdk';

/**
 * What went wrong, as far as the UI cares: whether there's anything to
 * retry (`network`/`server`), nothing to find (`not-found`), or a request
 * the store refused (`client`).
 */
export type AppErrorKind = 'not-found' | 'client' | 'server' | 'network';

/**
 * A failed Store API call, reduced to plain data - so it can sit in store
 * state and cross from server to browser in `TransferState`, which an
 * `Error` instance can't.
 */
export type AppError = {
  kind: AppErrorKind;
  /** The HTTP status, or `null` when no response arrived at all. */
  status: number | null;
  /** Safe to show the visitor. */
  message: string;
};

const FALLBACK_MESSAGES: Record<AppErrorKind, string> = {
  'not-found': 'We couldn’t find what you were looking for.',
  client: 'The store couldn’t process this request.',
  server: 'The store is having trouble right now. Please try again in a moment.',
  network: 'We couldn’t reach the store. Check your connection and try again.',
};

const kindForStatus = (status: number): AppErrorKind =>
  status === 404 ? 'not-found' : status >= 500 ? 'server' : 'client';

/**
 * Anything an SDK call rejected with, as an `AppError`. The SDK throws a
 * `FetchError` carrying the status for every non-2xx response; anything
 * else means no response arrived (offline, DNS, CORS, an aborted request).
 *
 * Only 4xx messages come from Medusa itself - they describe the request
 * ("Product with id: … was not found"). A 5xx message can leak internals,
 * and a network error's is the runtime's ("Failed to fetch"), so those get
 * a fixed message instead.
 */
export const toAppError = (error: unknown): AppError => {
  if (!(error instanceof FetchError) || error.status === undefined) {
    return { kind: 'network', status: null, message: FALLBACK_MESSAGES.network };
  }

  const { status } = error;
  const kind = kindForStatus(status);
  const message = kind === 'server' || !error.message ? FALLBACK_MESSAGES[kind] : error.message;

  return { kind, status, message };
};
