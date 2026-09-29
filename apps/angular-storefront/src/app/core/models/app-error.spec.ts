import { FetchError } from '@medusajs/js-sdk';
import { toAppError } from './app-error';

describe('toAppError', () => {
  it('maps a 404 to not-found, keeping Medusa’s message', () => {
    expect(toAppError(new FetchError('Product with id: nope was not found', 'Not Found', 404))).toEqual({
      kind: 'not-found',
      status: 404,
      message: 'Product with id: nope was not found',
    });
  });

  it('keeps other 4xx messages as client errors', () => {
    expect(toAppError(new FetchError('Invalid region', 'Bad Request', 400))).toMatchObject({
      kind: 'client',
      status: 400,
      message: 'Invalid region',
    });
  });

  it('hides 5xx messages behind a fixed one', () => {
    const error = toAppError(new FetchError('relation "product" does not exist', 'Internal Server Error', 500));

    expect(error.kind).toBe('server');
    expect(error.message).not.toContain('relation');
  });

  it('treats anything that is not a FetchError as a network failure', () => {
    expect(toAppError(new TypeError('Failed to fetch'))).toMatchObject({ kind: 'network', status: null });
    expect(toAppError('boom')).toMatchObject({ kind: 'network', status: null });
  });
});
