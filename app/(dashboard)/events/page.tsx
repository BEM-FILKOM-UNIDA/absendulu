import { createClient } from '@/lib/supabase/server'
import EventCard from '@/components/events/EventCard'
import { ButtonLink } from '@/components/ui/button'
import { isAdminRole } from '@/lib/auth/roles'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).single() : { data: null }
  const isAdmin = isAdminRole(profile?.role)
  const { data: events } = await supabase
    .from('events')
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .order('event_date', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow text-[var(--accent-strong)]">agenda organisasi / FILKOM UNIDA</p><h2 className="display-type mt-3 text-5xl leading-none tracking-[-.07em]">Temukan<br /><em>acaramu.</em></h2><p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">Lihat kegiatan organisasi Fakultas Ilmu Komputer dan pantau status absensinya.</p></div>{isAdmin && <ButtonLink href="/events/new" variant="accent">Buat acara <span aria-hidden="true">+</span></ButtonLink>}</section>
      {events && events.length > 0 ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-20 text-center"><p className="eyebrow text-[var(--accent-strong)]">belum ada agenda</p><h3 className="display-type mt-4 text-3xl">Belum ada acara.</h3><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Buat acara organisasi pertama untuk mulai mencatat kehadiran mahasiswa FILKOM.</p>{isAdmin && <ButtonLink href="/events/new" variant="accent" className="mt-7">Buat acara pertama</ButtonLink>}</div>}
    </div>
  )
}
