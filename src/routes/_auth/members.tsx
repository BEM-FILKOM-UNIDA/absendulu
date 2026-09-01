import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MemberImportForm } from '~/components/member-import-form'
import { getMembersData } from '~/server/data'
import { Badge, Card } from '~/components/ui'

const typeLabels: Record<string, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  tata_usaha: 'Tata Usaha',
}

export const Route = createFileRoute('/_auth/members')({
  loader: () => getMembersData(),
  component: MembersPage,
})

function MembersPage() {
  const { members } = Route.useLoaderData()
  const [rows, setRows] = useState(members)
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function toggleMember(member: (typeof members)[number]) {
    const active = member.account_status === 'active' && member.is_active
    if (active && !window.confirm('Nonaktifkan akun ini?')) return
    setLoadingId(member.id)
    setError('')
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_status: active ? 'disabled' : 'active' }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error || 'Status akun gagal diperbarui.')
        return
      }
      setRows((current) => current.map((item) => item.id === member.id ? { ...item, account_status: result.account_status, is_active: result.is_active } : item))
    } catch {
      setError('Status akun gagal diperbarui. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--border)] pb-8">
        <p className="eyebrow text-[var(--accent-strong)]">data mahasiswa / admin FILKOM</p>
        <h1 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Siapa saja<br /><em>yang terdaftar.</em></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Kelola akun yang dapat mengikuti absensi acara FILKOM.</p>
      </section>
      <MemberImportForm />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5">
          <div><p className="eyebrow text-[var(--accent-strong)]">data anggota</p><h2 className="mt-2 text-lg font-black">Akun terdaftar</h2></div>
          <span className="font-mono text-xs text-[var(--muted)]">{rows.length} akun</span>
        </div>
        {error ? <p role="alert" className="m-5 border border-[#e7b6b6] bg-[#f8dddd] px-4 py-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-[10px] font-black uppercase tracking-[.1em] text-[var(--muted)]"><tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">NIM/NIP</th><th className="px-5 py-3">Tipe</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Tindakan</th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((member) => {
                  const active = member.account_status === 'active' && member.is_active
                  return (
                    <tr key={member.id}>
                      <td className="px-5 py-4 font-semibold">{member.full_name || '-'}</td>
                      <td className="px-5 py-4 text-[var(--muted)]">{member.nim || '-'}</td>
                      <td className="px-5 py-4 text-[var(--muted)]">{typeLabels[member.user_type] || member.user_type}</td>
                      <td className="px-5 py-4 text-[var(--muted)]">{member.email || '-'}</td>
                      <td className="px-5 py-4"><Badge variant={active ? 'success' : 'danger'}>{active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                      <td className="px-5 py-4"><button type="button" disabled={loadingId === member.id} onClick={() => toggleMember(member)} className={`min-h-9 rounded-[4px] px-3 text-xs font-bold text-white disabled:opacity-50 ${active ? 'bg-[var(--danger)]' : 'bg-[var(--accent-strong)]'}`}>{loadingId === member.id ? 'Menyimpan…' : active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">Belum ada pengguna.</div>}
      </Card>
    </div>
  )
}
