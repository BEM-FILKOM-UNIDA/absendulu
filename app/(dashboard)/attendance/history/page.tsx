import { createClient } from '@/lib/supabase/server'

export default async function AttendanceHistoryPage() {
  const supabase = await createClient()

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, profiles(*), events(*)')
    .order('check_in_at', { ascending: false })
    .limit(100)

  // Group by event
  const byEvent: Record<string, typeof attendances> = {}
  attendances?.forEach((a) => {
    const name = (a as Record<string, unknown>).events
      ? ((a as Record<string, unknown>).events as Record<string, string>).name
      : 'Unknown'
    if (!byEvent[name]) byEvent[name] = []
    byEvent[name].push(a)
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Riwayat Kehadiran</h1>
      {Object.entries(byEvent).map(([name, atts]) => (
        <div key={name} className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold text-lg mb-2">{name}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Nama</th>
                <th className="py-2">NIM</th>
                <th className="py-2">Status</th>
                <th className="py-2">Metode</th>
                <th className="py-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {atts?.map((a) => {
                const profile = (a as Record<string, unknown>).profiles as
                  | Record<string, string>
                  | undefined
                return (
                  <tr key={a.id} className="border-b">
                    <td className="py-2">{profile?.full_name}</td>
                    <td className="py-2">{profile?.nim}</td>
                    <td className="py-2 font-medium">{a.status}</td>
                    <td className="py-2">{a.method}</td>
                    <td className="py-2">
                      {new Date(a.check_in_at).toLocaleString('id')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
