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

function ErrorComponent({ error }: { error: Error }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--paper)] p-6">
      <div className="max-w-md border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="eyebrow text-[var(--danger)]">terjadi kesalahan</p>
        <h1 className="display-type mt-3 text-4xl">Coba lagi.</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">{error.message}</p>
      </div>
    </main>
  )
}

export { ErrorComponent }
