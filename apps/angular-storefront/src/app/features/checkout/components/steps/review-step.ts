import { ChangeDetectionStrategy, Component, forwardRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OkklyTypography } from '@okkly/angular';
import { CartStore } from '../../../../shared/stores/cart.store';
import { CHECKOUT_STEP, type CheckoutStepHandle } from '../../checkout-page';

/** Ported from the Vue storefront's `ReviewStep`: places the order. */
@Component({
  selector: 'app-review-step',
  imports: [OkklyTypography],
  providers: [{ provide: CHECKOUT_STEP, useExisting: forwardRef(() => ReviewStep) }],
  template: `
    <h1 okklyTypography variant="h2">Review</h1>

    <form class="step-form" novalidate (submit)="$event.preventDefault(); submit()">
      <p okklyTypography variant="body-md" color="secondary">
        By clicking the Place order button, you confirm that you have read, understand and accept our Terms of
        Use, Terms of Sale and Returns Policy and acknowledge that you have read Medusa Store's Privacy Policy.
      </p>

      @if (error(); as message) {
        <p okklyTypography variant="body-sm" color="danger">{{ message }}</p>
      }
    </form>
  `,
  styleUrl: './step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStep implements CheckoutStepHandle {
  private readonly router = inject(Router);
  private readonly cartStore = inject(CartStore);

  private readonly pending = signal(false);
  readonly isPending = this.pending.asReadonly();
  protected readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.pending()) return;

    this.pending.set(true);
    this.error.set(null);

    try {
      const result = await this.cartStore.complete();

      switch (result.kind) {
        case 'order':
          await this.router.navigate(['/order/success'], { queryParams: { order_id: result.order.id } });
          return;
        case 'rejected':
          // Medusa looked at the cart and said no — that gets its own page.
          await this.router.navigate(['/order/failed'], { queryParams: { message: result.message } });
          return;
        case 'failed':
          // The request never got an answer — stay put so it can be retried.
          this.error.set(result.message);
          return;
      }
    } finally {
      this.pending.set(false);
    }
  }
}
