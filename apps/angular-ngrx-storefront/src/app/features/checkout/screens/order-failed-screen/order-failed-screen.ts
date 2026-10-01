import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OkklyButton, OkklyIcon, OkklyTypography } from '@okkly/angular';
import { iconX } from '@okkly/icons';

/** Ported from the Vue storefront's `OrderFailedScreen`: where the Review step lands when Medusa refuses the order. */
@Component({
  selector: 'app-order-failed-screen',
  imports: [OkklyButton, OkklyIcon, OkklyTypography, RouterLink],
  template: `
    <span class="order-failed__badge">
      <okkly-icon [icon]="iconX" fontSize="large" />
    </span>
    <h1 okklyTypography variant="h1">We couldn't place your order</h1>
    <p okklyTypography variant="body-md" color="secondary">{{ message() }}</p>
    <p okklyTypography variant="body-sm" color="muted">Your cart is untouched - nothing was charged.</p>

    <div class="order-failed__actions">
      <a okklyButton routerLink="/checkout" variant="primary" size="large" shape="pill">Back to checkout</a>
      <a okklyButton routerLink="/" variant="soft" size="large" shape="pill">Continue shopping</a>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--okkly-space-3);
      width: 100%;
      max-width: 28rem;
      margin: 0 auto;
      text-align: center;
    }

    h1,
    p {
      margin: 0;
    }

    .order-failed__badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      margin-bottom: var(--okkly-space-3);
      border-radius: var(--okkly-radius-full);
      background: color-mix(in srgb, var(--okkly-feedback-danger) 16%, transparent);
      color: var(--okkly-feedback-danger);
    }

    .order-failed__actions {
      display: flex;
      gap: var(--okkly-space-3);
      margin-top: var(--okkly-space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderFailedScreen {
  protected readonly iconX = iconX;

  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly message = computed(
    () => this.queryParams().get('message') || 'Something went wrong while placing your order.',
  );
}
