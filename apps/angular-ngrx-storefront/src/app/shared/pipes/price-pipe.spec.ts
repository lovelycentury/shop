import { PricePipe } from './price-pipe';

describe('PricePipe', () => {
  const pipe = new PricePipe();

  it('formats an amount in the given currency, whatever its case', () => {
    expect(pipe.transform(1234.5, 'eur')).toBe('€1,234.50');
    expect(pipe.transform(10, 'USD')).toBe('$10.00');
  });

  it('formats zero rather than hiding it', () => {
    expect(pipe.transform(0, 'usd')).toBe('$0.00');
  });
});
