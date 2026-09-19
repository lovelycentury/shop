import {
  dehydrate,
  hydrate,
  QueryClient,
  VueQueryPlugin,
  type DehydratedState,
} from "@tanstack/vue-query"

/**
 * Installs the Vue Query client the `shared/queries` and `shared/mutations`
 * composables all reach for - without it every `useQuery` throws
 * "No queryClient found".
 *
 * The cache is dehydrated into Nuxt's payload after the server render and
 * rehydrated before the client app mounts, so anything the server already
 * fetched (a query awaited through `suspense()`) is not fetched a second time
 * on hydration. `useState` is what carries it across: it is serialized into
 * the payload per request, so one visitor's cache never leaks into another's.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const vueQueryState = useState<DehydratedState | null>("vue-query")

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that a back-navigation reuses the cache instead of
        // refetching, short enough that prices/stock stay fresh.
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  })

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  if (import.meta.server) {
    nuxtApp.hooks.hook("app:rendered", () => {
      vueQueryState.value = dehydrate(queryClient)
    })
  }

  if (import.meta.client) {
    nuxtApp.hooks.hook("app:created", () => {
      hydrate(queryClient, vueQueryState.value)
    })
  }
})
