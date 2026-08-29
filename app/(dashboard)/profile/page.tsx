import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const typeLabels: Record<string, string> = { mahasiswa: 'Mahasiswa', dosen: 'Dosen', tata_usaha: 'Tata Usaha' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, nim, user_type, division, account_status')
    .eq('id', user?.id)
    .maybeSingle()

  return (
    <div className="max-w-3xl space-y-8">
      <section className="border-b border-[var(--border)] pb-8"><p className="eyebrow text-[var(--accent-strong)]">identitas mahasiswa / FILKOM</p><h1 className="display-type mt-3 text-5xl leading-none tracking-[-.07em]">Profil<br /><em>Absendulu.</em></h1></section>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] bg-[var(--ink)] p-6 text-[#f7f4ed] sm:flex-row sm:items-center"><div className="grid h-16 w-16 place-items-center bg-[var(--accent)] text-2xl font-black text-[var(--ink)]">{profile?.full_name?.slice(0, 1).toUpperCase() || 'A'}</div><div><p className="eyebrow text-[var(--accent)]">profil mahasiswa</p><h2 className="mt-2 text-2xl font-black">{profile?.full_name || 'Pengguna'}</h2><p className="mt-1 text-sm text-white/55">{user?.email}</p></div></div>
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2"><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">nim / nip</p><p className="mt-3 font-black">{profile?.nim || '-'}</p></div><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">tipe pengguna</p><p className="mt-3 font-black">{typeLabels[profile?.user_type] || profile?.user_type || '-'}</p></div><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">divisi</p><p className="mt-3 font-black">{profile?.division || 'Belum diisi'}</p></div><div className="bg-[var(--surface)] p-5"><p className="eyebrow text-[var(--muted-soft)]">status akun</p><div className="mt-3"><Badge variant={profile?.account_status === 'active' ? 'success' : profile?.account_status === 'disabled' ? 'danger' : 'muted'}>{profile?.account_status || 'belum diketahui'}</Badge></div></div></div>
      </Card>
    </div>
  )
}
