import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import ProfileActions from '@/components/profile/ProfileActions'
import ProfileEditor from '@/components/profile/ProfileEditor'

const typeLabels: Record<string, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  tata_usaha: 'Tata Usaha',
}

export default async function ProfilePage() {
  const { supabase, user } = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, nim, user_type, division, account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.account_status === 'disabled' || !profile.is_active) redirect('/account-disabled')
  if (profile.account_status !== 'active') redirect('/complete-profile')

  const isAdmin = isAdminRole(profile.role)
  const displayName = profile.full_name || 'Pengguna'
  const initial = displayName.slice(0, 1).toUpperCase()
  const identifierLabel = profile.user_type === 'mahasiswa' ? 'NIM' : 'NIP/NIK'

  return (
    <div className="max-w-3xl space-y-8">
      <section className="flex flex-col gap-5 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={isAdmin ? '/dashboard' : '/mahasiswa'} className="eyebrow text-[var(--accent-strong)] hover:underline">
            ← Kembali ke {isAdmin ? 'ringkasan' : 'beranda'}
          </Link>
          <h1 className="display-type mt-4 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Profil<br /><em>Absendulu.</em></h1>
        </div>
        <ProfileActions />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] bg-[var(--ink)] p-6 text-[#f7f4ed] sm:flex-row sm:items-center sm:p-8">
          <div className="grid h-16 w-16 shrink-0 place-items-center bg-[var(--accent)] text-2xl font-black text-[var(--ink)]">{initial}</div>
          <div className="min-w-0">
            <p className="eyebrow text-[var(--accent)]">akun aktif</p>
            <h2 className="mt-2 break-words text-2xl font-black">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-white/55">{user.email || 'Email belum tersedia'}</p>
          </div>
        </div>

        <dl className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">{identifierLabel}</dt><dd className="mt-3 font-black">{profile.nim || 'Belum diisi'}</dd></div>
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">Tipe pengguna</dt><dd className="mt-3 font-black">{typeLabels[profile.user_type] || profile.user_type}</dd></div>
          <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">Fakultas</dt><dd className="mt-3 font-black">Fakultas Ilmu Komputer</dd></div>
          {isAdmin && <div className="bg-[var(--surface)] p-5"><dt className="eyebrow text-[var(--muted-soft)]">Status akun</dt><dd className="mt-3"><Badge variant="success">Aktif</Badge></dd></div>}
        </dl>
      </Card>

      <ProfileEditor
        email={user.email || ''}
        fullName={profile.full_name || ''}
        nim={profile.nim || ''}
        division={profile.division || ''}
        userType={profile.user_type}
        canEditDivision={isAdmin}
      />
    </div>
  )
}
