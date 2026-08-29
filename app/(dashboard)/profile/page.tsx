import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import ProfileActions from '@/components/profile/ProfileActions'

const typeLabels: Record<string, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  tata_usaha: 'Tata Usaha',
}

export default async function ProfilePage() {
  const { supabase, user } = await getCurrentUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, nim, user_type, division, account_status')
    .eq('id', user?.id)
    .maybeSingle()

  const displayName = profile?.full_name || 'Pengguna'
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <div className="max-w-3xl space-y-8">
      <section className="flex flex-col gap-5 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard" className="eyebrow text-[var(--accent-strong)] hover:underline">← Kembali ke ringkasan</Link>
          <h1 className="display-type mt-4 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Profil<br /><em>Absendulu.</em></h1>
        </div>
        <ProfileActions />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] bg-[var(--ink)] p-6 text-[#f7f4ed] sm:flex-row sm:items-center sm:p-8">
          <div className="grid h-16 w-16 shrink-0 place-items-center bg-[var(--accent)] text-2xl font-black text-[var(--ink)]">{initial}</div>
          <div className="min-w-0">
            <p className="eyebrow text-[var(--accent)]">akun terverifikasi</p>
            <h2 className="mt-2 break-words text-2xl font-black">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-white/55">{user?.email || 'Email belum tersedia'}</p>
          </div>
        </div>

        <dl className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">NIM / NIP</dt><dd className="mt-3 font-black">{profile?.nim || 'Belum diisi'}</dd></div>
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">Tipe pengguna</dt><dd className="mt-3 font-black">{typeLabels[profile?.user_type || ''] || profile?.user_type || 'Belum diisi'}</dd></div>
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">Divisi</dt><dd className="mt-3 font-black">{profile?.division || 'Belum diisi'}</dd></div>
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">Status akun</dt><dd className="mt-3"><Badge variant={profile?.account_status === 'active' ? 'success' : profile?.account_status === 'disabled' ? 'danger' : 'muted'}>{profile?.account_status || 'Belum diketahui'}</Badge></dd></div>
        </dl>
      </Card>
    </div>
  )
}
