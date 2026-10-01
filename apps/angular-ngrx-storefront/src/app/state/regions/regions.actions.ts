import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { HttpTypes } from '@medusajs/types';

/** What the UI asks for. Whether a request actually goes out is `RegionsEffects`' call. */
export const RegionsActions = createActionGroup({
  source: 'Regions',
  events: {
    /** Skipped once regions are loaded or while a request is in flight. */
    Load: emptyProps(),
    /** Refetches even when regions are already loaded; still skipped while one is in flight. */
    Refresh: emptyProps(),
  },
});

/** What actually happened - only `RegionsEffects` dispatches these. */
export const RegionsApiActions = createActionGroup({
  source: 'Regions API',
  events: {
    'Fetch Started': emptyProps(),
    'Fetch Succeeded': props<{ regions: HttpTypes.StoreRegion[] }>(),
    'Fetch Failed': props<{ error: string }>(),
  },
});
