import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/account-disabled')({ component: AccountDisabledPage })

function AccountDisabledPage() {
  return <main className="grid min-h-screen place-items-center bg-(--paper) p-6"><section className="max-w-md border border-(--border) bg-(--surface) p-8"><p className="eyebrow text-(--danger)">akses akun</p><h1 className="display-type mt-3 text-4xl">Akun belum aktif.</h1><p className="mt-4 text-sm leading-6 text-(--muted)">Hubungi panitia FILKOM untuk mengaktifkan atau melengkapi akunmu.</p></section></main>
}
