'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/database'

export default function AttendanceCounter({
  sessionId,
  eventId,
  initialCount,
}: {
  sessionId: string
  eventId: string
  initialCount: number
}) {
  const [count, setCount] = useState(initialCount)
  const [recent, setRecent] = useState<Attendance[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial recent attendances
    supabase
      .from('attendances')
      .select('*, profiles(*)')
      .eq('session_id', sessionId)
      .order('check_in_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecent(data)
      })

    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`attendance:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendances',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setCount((c) => c + 1)
          setRecent((prev) =>
            [payload.new as Attendance, ...prev].slice(0, 5)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, eventId, supabase])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-5xl font-bold text-green-600 text-center mb-2">
        {count}
      </div>
      <div className="text-gray-600 text-center mb-4">peserta hadir</div>
      {recent.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">
            Terakhir scan:
          </p>
          {recent.map((a) => (
            <p key={a.id} className="text-sm text-gray-700">
              ✅ {a.profiles?.full_name} —{' '}
              {new Date(a.check_in_at).toLocaleTimeString('id')}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
