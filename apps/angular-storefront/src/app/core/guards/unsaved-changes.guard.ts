import { DOCUMENT, inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

/** A routed component that can hold input the visitor hasn't saved yet. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave this page anyway?';

/**
 * Asks before navigating away from a component with unsaved input. Covers
 * in-app navigation only — a reload or closed tab never reaches the router.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;

  // No window on the server — and nothing typed there to lose.
  const window = inject(DOCUMENT).defaultView;
  return window ? window.confirm(UNSAVED_CHANGES_MESSAGE) : true;
};
