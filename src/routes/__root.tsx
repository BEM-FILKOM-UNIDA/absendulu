/// <reference types="vite/client" />
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../styles/app.css?url'
import { RouteError, RouteNotFound } from '~/components/route-fallbacks'
import * as React from 'react'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Absendulu — Absensi Acara FILKOM UNIDA' },
      {
        name: 'description',
        content: 'Absensi digital untuk acara organisasi mahasiswa Fakultas Ilmu Komputer Universitas Djuanda.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: RouteNotFound,
  errorComponent: RouteError,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}



