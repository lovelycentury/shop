import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';
import { RegionsApiActions } from './regions.actions';

export type RegionsState = {
  regions: HttpTypes.StoreRegion[] | null;
  loading: boolean;
  error: string | null;
};

export const initialRegionsState: RegionsState = {
  regions: null,
  loading: false,
  error: null,
};

/**
 * The store's regions, shared across features: a region is the pricing
 * context of other Store API calls (products need it for
 * `calculated_price`, adding to cart needs a `regionId`, checkout needs its
 * countries). Ported from the Vue storefront's `useRegions`.
 */
export const regionsFeature = createFeature({
  name: 'regions',
  reducer: createReducer(
    initialRegionsState,
    on(RegionsApiActions.fetchStarted, (state): RegionsState => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(RegionsApiActions.fetchSucceeded, (state, { regions }): RegionsState => ({
      ...state,
      regions,
      loading: false,
    })),
    on(RegionsApiActions.fetchFailed, (state, { error }): RegionsState => ({
      ...state,
      loading: false,
      error,
    })),
  ),
  extraSelectors: ({ selectRegions }) => {
    const selectDefaultRegion = createSelector(selectRegions, (regions) => regions?.[0] ?? null);

    return {
      selectDefaultRegion,
      selectCountries: createSelector(selectDefaultRegion, (region) => region?.countries ?? []),
    };
  },
});
