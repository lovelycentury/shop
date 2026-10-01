import { vi } from 'vitest';
import { flushMicrotasks, setupState } from '../testing';
import { PaymentProvidersActions } from './payment-providers.actions';
import { paymentProvidersFeature } from './payment-providers.reducer';

const setup = (listPaymentProviders: (query: { region_id: string }) => Promise<unknown>) =>
  setupState({ payment: { listPaymentProviders } });

const providers = () => Promise.resolve({ payment_providers: [{ id: 'pp_system_default' }] });

describe('payment providers', () => {
  it('load skips an already-loaded region but fetches a new one', async () => {
    const listPaymentProviders = vi.fn(providers);
    const { store, read } = setup(listPaymentProviders);

    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_1' }));
    await flushMicrotasks();
    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(1);
    expect(listPaymentProviders).toHaveBeenCalledWith({ region_id: 'reg_1' });
    expect(read(paymentProvidersFeature.selectPaymentProviders)).toEqual([
      { id: 'pp_system_default' },
    ]);

    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_2' }));
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(2);
    expect(read(paymentProvidersFeature.selectRegionId)).toBe('reg_2');
  });

  it('refresh refetches an already-loaded region', async () => {
    const listPaymentProviders = vi.fn(providers);
    const { store } = setup(listPaymentProviders);

    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_1' }));
    await flushMicrotasks();
    store.dispatch(PaymentProvidersActions.refresh({ regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(2);
  });

  it('never runs two requests at once', async () => {
    const listPaymentProviders = vi.fn(providers);
    const { store, read } = setup(listPaymentProviders);

    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_1' }));
    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_2' }));
    store.dispatch(PaymentProvidersActions.refresh({ regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(1);
    expect(read(paymentProvidersFeature.selectLoading)).toBe(false);
  });

  it('allows retrying the same region after a failure', async () => {
    const listPaymentProviders = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ payment_providers: [{ id: 'pp_system_default' }] });
    const { store, read } = setup(listPaymentProviders);

    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_1' }));
    await flushMicrotasks();
    expect(read(paymentProvidersFeature.selectError)).toBe('Error: network error');

    store.dispatch(PaymentProvidersActions.load({ regionId: 'reg_1' }));
    await flushMicrotasks();

    expect(listPaymentProviders).toHaveBeenCalledTimes(2);
    expect(read(paymentProvidersFeature.selectPaymentProviders)).toEqual([
      { id: 'pp_system_default' },
    ]);
  });
});
