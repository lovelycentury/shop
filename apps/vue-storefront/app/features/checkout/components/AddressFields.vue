<script setup lang="ts">
import { computed } from "vue"
import { useField } from "vee-validate"

import { Autocomplete, TextField } from "@okkly/vue"

import type { RegionCountry } from "~/shared/types/medusa"

const props = defineProps<{
  /** Which half of the form this instance fills - matches the schema's own field paths. */
  prefix: "shippingAddress" | "billingAddress"
  countries: RegionCountry[]
}>()

const field = (name: string) => useField<string>(`${props.prefix}.${name}`)

const { value: firstName, errorMessage: firstNameError } = field("firstName")
const { value: lastName, errorMessage: lastNameError } = field("lastName")
const { value: company } = field("company")
const { value: address1, errorMessage: address1Error } = field("address1")
const { value: postalCode, errorMessage: postalCodeError } = field("postalCode")
const { value: city, errorMessage: cityError } = field("city")
const { value: countryCode, errorMessage: countryCodeError } =
  field("countryCode")
const { value: province } = field("province")

const countryOptions = computed(() =>
  props.countries.map((country) => ({
    value: country.iso_2 ?? "",
    label: country.display_name ?? country.iso_2 ?? "",
  }))
)

// Autocomplete's model is the selected option object, not a raw value - the
// schema (and the rest of this form) only cares about the iso_2 string, so
// this bridges the two rather than changing what `countryCode` holds.
const selectedCountry = computed({
  get: () =>
    countryOptions.value.find((option) => option.value === countryCode.value) ??
    null,
  set: (option) => {
    countryCode.value = option?.value ?? ""
  },
})
</script>

<template>
  <div class="address-fields">
    <TextField
      v-model="firstName"
      required
      full-width
      :error="!!firstNameError"
    >
      <template #label>First name</template>
      <template v-if="firstNameError" #helper-text>{{
        firstNameError
      }}</template>
    </TextField>
    <TextField v-model="lastName" required full-width :error="!!lastNameError">
      <template #label>Last name</template>
      <template v-if="lastNameError" #helper-text>{{ lastNameError }}</template>
    </TextField>

    <TextField v-model="address1" required full-width :error="!!address1Error">
      <template #label>Address</template>
      <template v-if="address1Error" #helper-text>{{ address1Error }}</template>
    </TextField>
    <TextField v-model="company" full-width>
      <template #label>Company</template>
    </TextField>

    <TextField
      v-model="postalCode"
      required
      full-width
      :error="!!postalCodeError"
    >
      <template #label>Postal code</template>
      <template v-if="postalCodeError" #helper-text>{{
        postalCodeError
      }}</template>
    </TextField>
    <TextField v-model="city" required full-width :error="!!cityError">
      <template #label>City</template>
      <template v-if="cityError" #helper-text>{{ cityError }}</template>
    </TextField>

    <Autocomplete
      v-model="selectedCountry"
      :options="countryOptions"
      required
      full-width
      disable-clearable
      :error="!!countryCodeError"
    >
      <template #label>Country</template>
      <template v-if="countryCodeError" #helper-text>{{
        countryCodeError
      }}</template>
    </Autocomplete>
    <TextField v-model="province" full-width>
      <template #label>State / Province</template>
    </TextField>
  </div>
</template>

<style scoped>
.address-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--okkly-space-4);
}

@media (max-width: 640px) {
  .address-fields {
    grid-template-columns: 1fr;
  }
}
</style>
