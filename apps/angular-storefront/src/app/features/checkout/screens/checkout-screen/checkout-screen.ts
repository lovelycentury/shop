import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  OkklyAlert,
  OkklyAlertAction,
  OkklyButton,
  OkklyButtonEndIcon,
  OkklyButtonStartIcon,
  OkklyIcon,
  OkklySkeleton,
  OkklyStepper,
  OkklyTypography,
  type StepperStep,
} from '@okkly/angular';
import { iconArrowRight, iconRefreshCw, iconShoppingCart } from '@okkly/icons';
import type { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { CartStore } from '../../../../shared/stores/cart.store';
import { RegionsStore } from '../../../../shared/stores/regions.store';
import type { CheckoutStep } from '../../checkout.constants';
import { CHECKOUT_STEP, CheckoutPage } from '../../checkout-page';
import { OrderSummary } from '../../components/order-summary/order-summary';
import { DeliveryStep } from '../../components/steps/delivery-step';
import { PaymentStep } from '../../components/steps/payment-step';
import { ReviewStep } from '../../components/steps/review-step';
import { ShippingStep } from '../../components/steps/shipping-step';

const STEPPER_STEPS: StepperStep[] = [
  { label: 'Cart' },
  { label: 'Shipping' },
  { label: 'Delivery' },
  { label: 'Payment' },
  { label: 'Review' },
];

const ACTION_LABELS: Record<CheckoutStep, string> = {
  shipping: 'Continue to delivery',
  delivery: 'Continue to payment',
  payment: 'Continue to review',
  review: 'Place order',
};

/**
 * Ported from the Vue storefront's `CheckoutScreen`: the stepper, the active
 * step, and the order summary whose one button submits that step.
 */
@Component({
  selector: 'app-checkout-screen',
  imports: [
    DeliveryStep,
    OkklyAlert,
    OkklyAlertAction,
    OkklyButton,
    OkklyButtonEndIcon,
    OkklyButtonStartIcon,
    OkklyIcon,
    OkklySkeleton,
    OkklyStepper,
    OkklyTypography,
    OrderSummary,
    PaymentStep,
    ReviewStep,
    RouterLink,
    ShippingStep,
  ],
  providers: [CheckoutPage],
  templateUrl: './checkout-screen.html',
  styleUrl: './checkout-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutScreen implements HasUnsavedChanges {
  protected readonly page = inject(CheckoutPage);
  private readonly cartStore = inject(CartStore);

  protected readonly stepperSteps = STEPPER_STEPS;
  protected readonly actionLabels = ACTION_LABELS;
  protected readonly iconArrowRight = iconArrowRight;
  protected readonly iconRefreshCw = iconRefreshCw;
  protected readonly iconShoppingCart = iconShoppingCart;

  /** Whichever step `@switch` currently renders — they all provide `CHECKOUT_STEP`. */
  private readonly activeStep = viewChild(CHECKOUT_STEP);

  protected readonly isSubmitting = computed(() => this.activeStep()?.isPending() ?? false);

  protected readonly shippingAmount = computed(() => {
    const cart = this.page.cart();
    return (cart?.shipping_methods?.length ?? 0) > 0 ? (cart?.shipping_total ?? 0) : null;
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      // `refresh`, not `load`: a cart already in state may have come from an
      // add-to-cart response, which lacks the payment session the stepper
      // checks — and checkout should price off the latest cart anyway.
      this.cartStore.refresh();
      inject(RegionsStore).load();
    }
  }

  /** The route's `unsavedChangesGuard` asks the screen; the form lives in the active step. */
  hasUnsavedChanges(): boolean {
    return this.activeStep()?.hasUnsavedChanges?.() ?? false;
  }

  protected submitActiveStep(): void {
    void this.activeStep()?.submit();
  }
}
