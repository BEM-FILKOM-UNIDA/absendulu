'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/database'

export default function AttendanceCounter({ sessionId, eventId, initialCount }: { sessionId: string; eventId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  const [recent, setRecent] = useState<Attendance[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('attendances')
      .select('*, profiles(*)')
      .eq('session_id', sessionId)
      .order('check_in_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecent(data as Attendance[])
      })

    const channel = supabase
      .channel(`attendance:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendances', filter: `session_id=eq.${sessionId}` }, (payload) => {
        setCount((current) => current + 1)
        setRecent((current) => [payload.new as Attendance, ...current].slice(0, 5))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, eventId, supabase])

  return (
    <div className="border border-white/10 bg-white/5 p-6 text-[#f7f4ed]">
      <p className="eyebrow text-[var(--accent)]">live count</p>
      <p className="mt-2 text-6xl font-black tracking-[-.1em] text-[var(--lime)]">{count}</p>
      <p className="mt-1 text-sm text-white/45">peserta hadir sekarang</p>
      {recent.length > 0 && (
        <div className="mt-7 border-t border-white/10 pt-5">
          <p className="eyebrow text-white/35">last scans</p>
          <div className="mt-3 space-y-3">
            {recent.map((attendance) => (
              <div key={attendance.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold">{attendance.profiles?.full_name || 'Peserta'}</span>
                <span className="shrink-0 font-mono text-xs text-white/40">{new Date(attendance.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
