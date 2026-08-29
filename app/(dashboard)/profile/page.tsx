import { createClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profil Saya</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="text-sm text-gray-500">Nama</label>
          <p className="font-medium">{profile?.full_name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">NIM</label>
          <p className="font-medium">{profile?.nim}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Divisi</label>
          <p className="font-medium">{profile?.division || '-'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="font-medium">{user?.email}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Status</label>
          <p className="font-medium">
            {profile?.is_active ? '✅ Aktif' : '❌ Nonaktif'}
          </p>
        </div>
      </div>
    </div>
  )
}
