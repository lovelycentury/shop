import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import { UNSAVED_CHANGES_MESSAGE, unsavedChangesGuard } from './unsaved-changes.guard';

const run = (hasUnsavedChanges: boolean) =>
  TestBed.runInInjectionContext(() =>
    unsavedChangesGuard(
      { hasUnsavedChanges: () => hasUnsavedChanges },
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  );

describe('unsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lets a component with nothing unsaved go without asking', () => {
    const confirm = vi.spyOn(window, 'confirm');

    expect(run(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving unsaved changes, and stays when declined', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    expect(run(true)).toBe(false);
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE);
  });

  it('leaves when the visitor confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    expect(run(true)).toBe(true);
  });
});
