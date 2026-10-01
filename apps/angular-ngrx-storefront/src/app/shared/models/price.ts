/**
 * A fixed locale rather than the visitor's: `Intl` would otherwise group and
 * place the currency symbol one way on the server (Node's locale) and another
 * in the browser, which breaks hydration on every price.
 */
const PRICE_LOCALE = 'en-US';

/** Formats a Medusa amount - already in major units, v2 amounts are decimal. */
export const formatAmount = (amount: number, currencyCode: string): string =>
  new Intl.NumberFormat(PRICE_LOCALE, {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount);
