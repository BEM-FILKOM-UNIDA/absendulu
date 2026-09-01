import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { RouteError, RouteNotFound, RoutePending } from '~/components/route-fallbacks'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
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
