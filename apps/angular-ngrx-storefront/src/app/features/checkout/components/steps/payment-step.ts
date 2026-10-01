import { ChangeDetectionStrategy, Component, forwardRef, inject, signal } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { OkklyIcon, OkklyRadio, OkklyTypography } from '@okkly/angular';
import { iconCreditCard } from '@okkly/icons';
import { CART_MUTATION_RESULTS, CartActions, CartApiActions } from '../../../../state/cart/cart.actions';
import { dispatchAndWait } from '../../../../state/dispatch-and-wait';
import { PaymentProvidersActions } from '../../../../state/payment-providers/payment-providers.actions';
import { paymentProvidersFeature } from '../../../../state/payment-providers/payment-providers.reducer';
import { MANUAL_PAYMENT_PROVIDER_ID } from '../../checkout.constants';
import { CHECKOUT_STEP, CheckoutPage, type CheckoutStepHandle } from '../../checkout-page';

const PROVIDER_LABELS: Record<string, string> = {
  [MANUAL_PAYMENT_PROVIDER_ID]: 'Manual Payment',
};

/**
 * Ported from the Vue storefront's `PaymentStep`. The store has a single,
 * manual provider, so there's nothing to choose and no form — submitting
 * just starts a payment session with it.
 */
@Component({
  selector: 'app-payment-step',
  imports: [OkklyIcon, OkklyRadio, OkklyTypography],
  providers: [{ provide: CHECKOUT_STEP, useExisting: forwardRef(() => PaymentStep) }],
  template: `
    <h1 okklyTypography variant="h2">Payment</h1>

    <form class="step-options" novalidate (submit)="$event.preventDefault(); submit()">
      @for (provider of paymentProviders(); track provider.id) {
        <label class="step-option step-option--selected payment-option">
          <okkly-radio [checked]="true" [value]="provider.id" [attr.aria-label]="label(provider.id)" />
          <span okklyTypography variant="label-md">{{ label(provider.id) }}</span>
          <span class="payment-option__notice">Attention: For testing purposes only.</span>
          <okkly-icon [icon]="iconCreditCard" fontSize="small" class="payment-option__icon" />
        </label>
      }

      @if (error() ?? providersError(); as message) {
        <p okklyTypography variant="body-sm" color="danger">{{ message }}</p>
      }
    </form>
  `,
  styleUrl: './step.scss',
  styles: `
    .payment-option {
      cursor: default;
    }

    .payment-option__notice {
      padding: 0.25rem 0.625rem;
      border-radius: var(--okkly-radius-full);
      background: color-mix(in srgb, var(--okkly-feedback-warning) 16%, transparent);
      color: var(--okkly-feedback-warning);
      font-size: 0.8125rem;
      font-weight: var(--okkly-font-weight-medium);
    }

    .payment-option__icon {
      margin-left: auto;
      color: var(--okkly-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentStep implements CheckoutStepHandle {
  private readonly page = inject(CheckoutPage);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);

  protected readonly paymentProviders = this.store.selectSignal(paymentProvidersFeature.selectPaymentProviders);
  protected readonly providersError = this.store.selectSignal(paymentProvidersFeature.selectError);

  protected readonly iconCreditCard = iconCreditCard;

  private readonly pending = signal(false);
  readonly isPending = this.pending.asReadonly();
  protected readonly error = signal<string | null>(null);

  constructor() {
    const regionId = this.page.cart()?.region_id;
    if (regionId) this.store.dispatch(PaymentProvidersActions.load({ regionId }));
  }

  protected label(providerId: string): string {
    return PROVIDER_LABELS[providerId] ?? providerId;
  }

  async submit(): Promise<void> {
    if (this.pending()) return;

    this.pending.set(true);
    this.error.set(null);

    try {
      const result = await dispatchAndWait(
        this.store,
        this.actions$,
        CartActions.createPaymentSession({ body: { provider_id: MANUAL_PAYMENT_PROVIDER_ID } }),
        CART_MUTATION_RESULTS,
      );

      if (result.type === CartApiActions.mutationSucceeded.type) {
        await this.page.goToStep('review');
      } else {
        this.error.set(result.error);
      }
    } finally {
      this.pending.set(false);
    }
  }
}
