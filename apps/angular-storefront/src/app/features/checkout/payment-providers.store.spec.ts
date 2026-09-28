import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MEDUSA_SDK } from '../../core/services/medusa-sdk';
import { PaymentProvidersStore } from './payment-providers.store';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(listPaymentProviders: (query: { region_id: string }) => Promise<unknown>) {
  TestBed.configureTestingModule({
    providers: [{ provide: MEDUSA_SDK, useValue: { store: { payment: { listPaymentProviders } } } }],
  });

  return TestBed.inject(PaymentProvidersStore);
}

const providers = () => Promise.resolve({ payment_providers: [{ id: 'pp_system_default' }] });

describe('PaymentProvidersStore', () => {
  it('load skips an already-loaded region but fetches a new one', async () => {
    const listPaymentProviders = vi.fn(providers);
    const store = setup(listPaymentProviders);

    store.load('reg_1');
    await flushMicrotasks();
    store.load('reg_1');
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(1);
    expect(listPaymentProviders).toHaveBeenCalledWith({ region_id: 'reg_1' });
    expect(store.getAll()).toEqual([{ id: 'pp_system_default' }]);
    expect(store.getById('pp_system_default')).toEqual({ id: 'pp_system_default' });

    store.load('reg_2');
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(2);
    expect(store.regionId()).toBe('reg_2');
  });

  it('refresh refetches an already-loaded region', async () => {
    const listPaymentProviders = vi.fn(providers);
    const store = setup(listPaymentProviders);

    store.load('reg_1');
    await flushMicrotasks();
    store.refresh('reg_1');
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(2);
  });

  it('never runs two requests at once', async () => {
    const listPaymentProviders = vi.fn(providers);
    const store = setup(listPaymentProviders);

    store.load('reg_1');
    store.load('reg_2');
    store.refresh('reg_1');
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(1);
    expect(store.loading()).toBe(false);
  });

  it('allows retrying the same region after a failure', async () => {
    const listPaymentProviders = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ payment_providers: [{ id: 'pp_system_default' }] });
    const store = setup(listPaymentProviders);

    store.load('reg_1');
    await flushMicrotasks();
    expect(store.error()).toBe('Error: network error');

    store.load('reg_1');
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(2);
    expect(store.getAll()).toEqual([{ id: 'pp_system_default' }]);
  });
});
