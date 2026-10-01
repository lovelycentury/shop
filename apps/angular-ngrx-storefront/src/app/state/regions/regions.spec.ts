import { vi } from 'vitest';
import { flushMicrotasks, setupState } from '../testing';
import { RegionsActions } from './regions.actions';
import { regionsFeature } from './regions.reducer';

const setup = (list: () => Promise<unknown>) => setupState({ region: { list } });

const twoRegions = () =>
  Promise.resolve({
    regions: [
      { id: 'reg_1', countries: [{ iso_2: 'dk' }] },
      { id: 'reg_2', countries: [{ iso_2: 'us' }] },
    ],
  });

describe('regions', () => {
  it('loads regions once and derives the default region and its countries', async () => {
    const list = vi.fn(twoRegions);
    const { store, read } = setup(list);

    store.dispatch(RegionsActions.load());
    await flushMicrotasks();
    store.dispatch(RegionsActions.load());
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(1);
    expect(read(regionsFeature.selectDefaultRegion)?.id).toBe('reg_1');
    expect(read(regionsFeature.selectCountries)).toEqual([{ iso_2: 'dk' }]);
    expect(read(regionsFeature.selectRegions)?.map((region) => region.id)).toEqual([
      'reg_1',
      'reg_2',
    ]);
  });

  it('refresh refetches already-loaded regions', async () => {
    const list = vi.fn(twoRegions);
    const { store } = setup(list);

    store.dispatch(RegionsActions.load());
    await flushMicrotasks();
    store.dispatch(RegionsActions.refresh());
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
  });

  it('never runs two requests at once', async () => {
    const list = vi.fn(twoRegions);
    const { store, read } = setup(list);

    store.dispatch(RegionsActions.load());
    store.dispatch(RegionsActions.load());
    store.dispatch(RegionsActions.refresh());
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(1);
    expect(read(regionsFeature.selectLoading)).toBe(false);
  });

  it('allows a retry after a failure', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ regions: [{ id: 'reg_1', countries: [] }] });
    const { store, read } = setup(list);

    store.dispatch(RegionsActions.load());
    await flushMicrotasks();
    expect(read(regionsFeature.selectError)).toBe('Error: network error');

    store.dispatch(RegionsActions.load());
    await flushMicrotasks();

    expect(list).toHaveBeenCalledTimes(2);
    expect(read(regionsFeature.selectDefaultRegion)?.id).toBe('reg_1');
  });
});
