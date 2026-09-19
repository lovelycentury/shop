<script setup lang="ts">
import { AnimatedBackground } from "@okkly/vue"

import { Header } from "~/widgets/Header"
</script>

<template>
  <div class="app-shell">
    <ClientOnly>
      <AnimatedBackground preset="aurora" scrim class="app-shell__background" />
    </ClientOnly>
    <div class="app-shell__content">
      <Header />
      <main class="app-shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: fixed;
  inset: 0;
}

.app-shell__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.app-shell__main {
  flex: 1 1 auto;
  padding: var(--okkly-space-8) var(--okkly-space-16) var(--okkly-space-16);
}

@media (max-width: 768px) {
  .app-shell__main {
    padding: var(--okkly-space-6) var(--okkly-space-6) var(--okkly-space-8);
  }
}
</style>
