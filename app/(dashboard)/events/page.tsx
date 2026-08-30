import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { isAdminRole } from '@/lib/auth/roles'
import EventCard from '@/components/events/EventCard'
import { ButtonLink } from '@/components/ui/button'

export default async function EventsPage() {
  const { supabase, user } = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.account_status !== 'active' || !profile.is_active) redirect('/complete-profile')

  const isAdmin = isAdminRole(profile.role)
  const database = createAdminClient()
  let eventsQuery = database
    .from('events')
    .select('id, name, description, event_date, start_time, end_time, location, status')
    .order('event_date', { ascending: !isAdmin })
    .order('start_time', { ascending: true })
    .limit(100)
  if (!isAdmin) eventsQuery = eventsQuery.eq('status', 'active')
  const { data: events } = await eventsQuery

  const eyebrow = isAdmin ? 'agenda organisasi / FILKOM UNIDA' : 'agenda publik / FILKOM UNIDA'
  const description = isAdmin ? 'Lihat kegiatan organisasi dan kelola status absensinya.' : 'Lihat acara aktif yang dapat kamu ikuti.'

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-[var(--border)] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-[var(--accent-strong)]">{eyebrow}</p>
          <h2 className="display-type mt-3 text-4xl leading-none tracking-[-.07em] sm:text-5xl">Temukan<br /><em>acaramu.</em></h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        {isAdmin && <ButtonLink href="/events/new" variant="accent">Buat acara <span aria-hidden="true">+</span></ButtonLink>}
      </section>

      {events && events.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-20 text-center">
          <p className="eyebrow text-[var(--accent-strong)]">belum ada agenda</p>
          <h3 className="display-type mt-4 text-3xl">Belum ada acara.</h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">{isAdmin ? 'Buat acara organisasi pertama untuk mulai mencatat kehadiran.' : 'Acara yang sudah dipublikasikan akan muncul di sini.'}</p>
          {isAdmin && <ButtonLink href="/events/new" variant="accent" className="mt-7">Buat acara pertama</ButtonLink>}
        </div>
      )}
    </div>
  )
}
