import { createClient } from '@/lib/supabase/server'

export default async function AttendanceHistoryPage() {
  const supabase = createClient()

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, profiles(*), events(*)')
    .order('check_in_at', { ascending: false })
    .limit(100)

  // Group by event
  const byEvent =
    attendances?.reduce(
      (acc, a) => {
        const name = a.events?.name || 'Unknown'
        if (!acc[name]) acc[name] = []
        acc[name].push(a)
        return acc
      },
      {} as Record<string, typeof attendances>
    ) || {}

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
              {atts.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.profiles?.full_name}</td>
                  <td className="py-2">{a.profiles?.nim}</td>
                  <td className="py-2 font-medium">{a.status}</td>
                  <td className="py-2">{a.method}</td>
                  <td className="py-2">
                    {new Date(a.check_in_at).toLocaleString('id')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
