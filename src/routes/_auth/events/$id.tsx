import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/events/$id')({
  component: () => <Outlet />,
})
