import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: events } = await supabase.from('events').select('*')
  const { data: profiles } = await supabase.from('profiles').select('*')
  const { data: sessions } = await supabase
    .from('attendance_sessions')
    .select('*, attendances(*)')
    .eq('is_open', true)

  const totalEvents = events?.length || 0
  const totalMembers = profiles?.length || 0
  const activeSessions = sessions?.length || 0
  const totalCheckIns =
    sessions?.reduce(
      (acc, s) => acc + (s.attendances?.length || 0),
      0
    ) || 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{totalEvents}</div>
          <div className="text-gray-600">Total Acara</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">
            {totalMembers}
          </div>
          <div className="text-gray-600">Total Anggota</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-yellow-600">
            {activeSessions}
          </div>
          <div className="text-gray-600">Sesi Aktif</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">
            {totalCheckIns}
          </div>
          <div className="text-gray-600">Check-in Hari Ini</div>
        </div>
      </div>
    </div>
  )
}
