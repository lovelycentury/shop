import { Pipe, type PipeTransform } from '@angular/core';
import { formatAmount } from '../models/price';

/**
 * `{{ cart.total | price: cart.currency_code }}` - a Medusa amount as a
 * currency string. Pure, so it only reformats when an input changes.
 */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(amount: number, currencyCode: string): string {
    return formatAmount(amount, currencyCode);
  }
}
