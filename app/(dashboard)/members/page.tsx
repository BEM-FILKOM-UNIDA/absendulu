import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import MemberImportForm from '@/components/members/MemberImportForm'
import { Badge } from '@/components/ui/badge'

const typeLabels: Record<string, string> = { mahasiswa: 'Mahasiswa', dosen: 'Dosen', tata_usaha: 'Tata Usaha' }

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdminRole(profile?.role)) redirect('/dashboard')
  const { data: members } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <div className="space-y-8">
      <section className="border-b border-[var(--border)] pb-8"><p className="eyebrow text-[var(--accent-strong)]">people index / admin only</p><h1 className="display-type mt-3 text-5xl leading-none tracking-[-.07em]">Orang-orang<br /><em>yang hadir.</em></h1><p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Kelola daftar resmi mahasiswa, dosen, dan Tata Usaha dari satu sumber yang rapi.</p></section>
      <MemberImportForm />
      <div className="overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5"><div><p className="eyebrow text-[var(--accent-strong)]">directory</p><h2 className="mt-2 text-lg font-black">Pengguna terdaftar</h2></div><span className="font-mono text-xs text-[var(--muted)]">{members?.length || 0} akun</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[var(--surface-muted)] text-left text-[10px] font-black uppercase tracking-[.1em] text-[var(--muted)]"><tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">NIM/NIP</th><th className="px-5 py-3">Tipe</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-[var(--border)]">
          {members?.map((member) => { const active = member.account_status === 'active' && member.is_active; const disabled = member.account_status === 'disabled' || !member.is_active; return <tr key={member.id} className="hover:bg-[var(--surface-muted)]"><td className="px-5 py-4 font-semibold">{member.full_name}</td><td className="px-5 py-4 text-[var(--muted)]">{member.nim}</td><td className="px-5 py-4 text-[var(--muted)]">{typeLabels[member.user_type] || member.user_type}</td><td className="px-5 py-4 text-[var(--muted)]">{member.email || '-'}</td><td className="px-5 py-4"><Badge variant={active ? 'success' : disabled ? 'danger' : 'muted'}>{active ? 'Aktif' : disabled ? 'Nonaktif' : 'Menunggu aktivasi'}</Badge></td></tr> })}
        </tbody></table></div>
        {(!members || members.length === 0) && <p className="px-6 py-12 text-center text-sm text-[var(--muted)]">Belum ada pengguna.</p>}
      </div>
    </div>
  )
}
