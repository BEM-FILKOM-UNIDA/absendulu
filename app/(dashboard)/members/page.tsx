import { createClient } from '@/lib/supabase/server'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Daftar Anggota</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Nama
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                NIM
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Divisi
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members?.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{m.full_name}</td>
                <td className="px-4 py-3">{m.nim}</td>
                <td className="px-4 py-3">{m.division || '-'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      m.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
