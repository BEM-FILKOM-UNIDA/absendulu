import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { RouteError, RouteNotFound, RoutePending } from '~/components/route-fallbacks'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 10_000,
    defaultStaleTime: 5_000,
    defaultGcTime: 60_000,
    // Show content skeleton immediately after navbar switches (default was 1000ms).
    defaultPendingMs: 0,
    defaultPendingMinMs: 120,
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
