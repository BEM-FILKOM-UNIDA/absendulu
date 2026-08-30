export type UserType = 'mahasiswa' | 'dosen' | 'tata_usaha'
export type AccountStatus = 'invited' | 'active' | 'disabled'
export type UserRole = 'admin_bem' | 'admin' | 'user' | 'anggota'

export interface Profile {
  id: string
  full_name: string
  nim: string
  nim_format_legacy: boolean
  email: string | null
  division: string | null
  phone: string | null
  user_type: UserType
  account_status: AccountStatus
  is_active: boolean
  role: UserRole
  created_at: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
}

export interface AttendanceSession {
  id: string
  event_id: string
  is_open: boolean
  qr_token: string
  opened_by: string
  opened_at: string
  closed_at: string | null
  events?: Event
}

export interface Attendance {
  id: string
  session_id: string
  event_id: string
  user_id: string
  status: 'hadir' | 'terlambat' | 'izin' | 'alpha'
  method: 'QR_CODE' | 'MANUAL'
  check_in_at: string
  notes: string | null
  profiles?: Profile
}
