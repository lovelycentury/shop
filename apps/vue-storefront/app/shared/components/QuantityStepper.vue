<script setup lang="ts">
import { Icon } from "@okkly/vue"

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    disabled?: boolean
  }>(),
  { min: 1, disabled: false }
)

const emit = defineEmits<{ "update:modelValue": [value: number] }>()

const decrease = () =>
  emit("update:modelValue", Math.max(props.min, props.modelValue - 1))
const increase = () => emit("update:modelValue", props.modelValue + 1)
</script>

<template>
  <div class="quantity-stepper" role="group" aria-label="Quantity">
    <button
      type="button"
      class="quantity-stepper__btn"
      :disabled="disabled || modelValue <= min"
      aria-label="Decrease quantity"
      @click="decrease"
    >
      <Icon name="iconMinus" font-size="small" />
    </button>
    <span class="quantity-stepper__value">{{ modelValue }}</span>
    <button
      type="button"
      class="quantity-stepper__btn"
      :disabled="disabled"
      aria-label="Increase quantity"
      @click="increase"
    >
      <Icon name="iconPlus" font-size="small" />
    </button>
  </div>
</template>

<style scoped>
.quantity-stepper {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  border: 1px solid var(--okkly-border-default);
  border-radius: var(--okkly-radius-md);
  overflow: hidden;
}

.quantity-stepper__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--okkly-space-2);
  border: none;
  background: none;
  color: var(--okkly-text-primary);
  cursor: pointer;
}

.quantity-stepper__btn:hover:not(:disabled) {
  background: var(--okkly-glass-fill);
}

.quantity-stepper__btn:disabled {
  color: var(--okkly-text-muted);
  cursor: not-allowed;
}

.quantity-stepper__value {
  min-width: 1.5rem;
  padding: 0 var(--okkly-space-1);
  text-align: center;
  font-size: 0.8125rem;
  font-weight: var(--okkly-font-weight-medium);
  color: var(--okkly-text-primary);
}
</style>
