# Attendance CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only `GET /api/events/$id/attendance-export` yang mengunduh absensi satu acara sebagai CSV (BOM UTF-8, quoting RFC 4180, CRLF) plus tombol "Export CSV" di halaman detail acara.

**Architecture:** Helper CSV murni (`toCsv`) di `src/lib/export/csv.ts` — murni agar bisa dites dengan skrip transpile seperti `scripts/test-history-filters.mjs`. Endpoint API baru memakai guard `withAdminApi` yang sudah ada, mengambil data lewat helper `fetchEventAttendance` yang di-inject client (pola `fetchHistory`), lalu merangkai CSV dan mengembalikan `Response` `text/csv; charset=utf-8` + `Content-Disposition: attachment`. UI menambah tombol Export CSV di kartu admin halaman detail acara, hanya saat `isAdmin`.

**Tech Stack:** TypeScript 5.9, TanStack Router/Start 1.170.32/1.168.49, Supabase JS 2.112.4, Node assert + Bun regression scripts (pola `scripts/test-history-filters.mjs`), Tailwind CSS v4.

## Global Constraints

- Tidak menambah dependency baru (`dayjs` TIDAK ditambahkan; pakai `new Date(...).toLocaleString('id-ID')` seperti `src/routes/_auth/mahasiswa.tsx:118`).
- Tidak menambah `baseUrl`/`ignoreDeprecations` ke `tsconfig.json`; alias `~/...` dipertahankan.
- Tailwind v4: CSS variable memakai bentuk `(--variable)`; `wrap-break-word`, bukan `break-words`; tidak menulis ulang class yang sudah ada.
- Tidak menambah code comments (konvensi plan sebelumnya `2026-09-24-tanstack-csrf.md`).
- Endpoint admin-only lewat `withAdminApi` — non-admin wajib menerima 403.
- Jangan memakai join PostgREST `profiles!inner(...)` dari `attendances`: tidak ada FK `attendances → profiles` (FK-nya ke `auth.users`); ikuti pola `fetchHistory` (query profiles terpisah dengan `in('id', userIds)`).
- Query diberi `.limit()` eksplisit; `.order('check_in_at', { ascending: true })` agar urutan kronologis.
- Validasi wajib: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run check`, `git diff --check`.
- Pesan error UI memakai Bahasa Indonesia, konsisten dengan file sekitar.

---

### Task 1: Helper CSV murni + regression script

**Files:**
- Create: `src/lib/export/csv.ts`
- Create: `scripts/test-csv-export.mjs`
- Modify: `package.json` (tambah script `"test:csv"` dan masukkan ke chain `check`)

**Interfaces:**
- Consumes: tidak ada (murni).
- Produces: `export type CsvCell = string | number | boolean | null | undefined`; `export function csvEscape(value: CsvCell): string`; `export function toCsv(headers: string[], rows: CsvCell[][]): string`. Kontrak: BOM `\uFEFF` di depan, delimiter `,`, EOL `\r\n` (juga setelah baris terakhir), nilai `null`/`undefined` jadi string kosong, quote dipakai hanya jika nilai mengandung `"` `,` `\r` `\n`, `"` di-doubled.

- [ ] **Step 1: Tulis regression script yang gagal (RED)**

Buat `scripts/test-csv-export.mjs` mengikuti pola transpile `scripts/test-history-filters.mjs`:

```js
import { strict as assert } from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const directory = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(directory, '..', 'src', 'lib', 'export', 'csv.ts')

const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
  },
}).outputText
const module = { exports: {} }
new Function('module', 'exports', output)(module, module.exports)
const { toCsv } = module.exports

assert.equal(
  toCsv(['full_name', 'nim', 'check_in_at', 'status'], [['Budi Santoso', 'I.2410036', '2026-09-28T02:00:00+00:00', 'hadir']]),
  '\uFEFFfull_name,nim,check_in_at,status\r\nBudi Santoso,I.2410036,2026-09-28T02:00:00+00:00,hadir\r\n',
)

assert.equal(
  toCsv(['full_name', 'nim'], [['Anak", kecil', 'I.2410037'], ['Baris\r\nbaru', null]]),
  '\uFEFFfull_name,nim\r\n"Anak"", kecil",I.2410037\r\n"Baris\r\nbaru",\r\n',
)

assert.equal(toCsv(['a'], []), '\uFEFFa\r\n')

assert.equal(toCsv(['a', 'b'], [[1, true], [null, undefined]]), '\uFEFFa,b\r\n1,true,\r\n')

console.log('csv-export: semua assertion lulus')
```

- [ ] **Step 2: Jalankan script dan pastikan gagal**

Run: `bun scripts/test-csv-export.mjs`

Expected: FAIL — `Cannot find module ... src/lib/export/csv.ts` (file belum ada).

- [ ] **Step 3: Implementasi minimal `src/lib/export/csv.ts`**

```ts
export type CsvCell = string | number | boolean | null | undefined

const BOM = '\uFEFF'

export function csvEscape(value: CsvCell): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (!/["\r\n,]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map((cell) => csvEscape(cell)).join(','))
  return BOM + lines.join('\r\n') + '\r\n'
}
```

- [ ] **Step 4: Jalankan script dan pastikan lulus**

Run: `bun scripts/test-csv-export.mjs`

Expected: `csv-export: semua assertion lulus`

- [ ] **Step 5: Daftarkan script di `package.json`**

Pada objek `scripts`, tambahkan `"test:csv": "bun scripts/test-csv-export.mjs"` setelah baris `"test:filters"`, dan ubah awal chain `check` menjadi:

```json
"check": "bun run test:schedule && bun run test:auth && bun run test:filters && bun run test:csv && bun run lint && bun run typecheck && bun run build"
```

- [ ] **Step 6: Validasi cepat + commit**

Run:

```bash
bun run test:csv && bun run typecheck && bun run lint
git add src/lib/export/csv.ts scripts/test-csv-export.mjs package.json
git commit -m "feat: add RFC 4180 CSV serializer helper"
```

Expected: test lulus, typecheck/lint bersih; commit berisi 3 file.

---

### Task 2: Endpoint admin-only `GET /api/events/$id/attendance-export`

**Files:**
- Create: `src/routes/api/events/$id/attendance-export.ts`
- Modify: `src/server/data/attendance.ts` (tambah `fetchEventAttendance`)
- Modify: `scripts/test-auth.mjs` (regresi 403 & shape endpoint)

**Interfaces:**
- Consumes: `withAdminApi(request, { parseBody: false, requireSameOrigin: false })` dari `~/server/api-middleware` (mengembalikan `Response` 403 atau `{ isAdmin: true, user, body: undefined, cookies: string[] }`); `createAdminClient()` dari `~/server/supabase-context`; `toCsv(headers, rows: CsvCell[][])` dari `~/lib/export/csv`; `createFileRoute` dari `@tanstack/react-router`.
- Produces: `export type EventAttendanceRow = { user_id: string; status: string | null; method: string | null; check_in_at: string | null; profiles: { full_name: string | null; nim: string | null } | null }`; `export async function fetchEventAttendance(supabase: SupabaseClient, eventId: string): Promise<EventAttendanceRow[]>` di `src/server/data/attendance.ts`. HTTP contract: `200` → `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="attendance-{id}.csv"`, `Cache-Control: no-store`; `403` JSON `{ error }` untuk non-admin; `404` JSON `{ error: 'Acara tidak ditemukan.' }`; `500` JSON `{ error: 'Gagal memuat data absensi.' }`.

- [ ] **Step 1: Tulis asersi regresi yang gagal (RED) di `scripts/test-auth.mjs`**

Baca file dulu, lalu tambahkan blok berikut sebelum assertion `PASS` akhir (sesuaikan nama variabel direktori yang sudah ada di file tersebut):

```js
const exportPath = path.join(directory, '..', 'src', 'routes', 'api', 'events', '$id', 'attendance-export.ts')
const exportSource = fs.readFileSync(exportPath, 'utf8')

assert.match(exportSource, /withAdminApi\(request,\s*\{\s*parseBody:\s*false,\s*requireSameOrigin:\s*false\s*\}\)/)
assert.match(exportSource, /403/)
assert.match(exportSource, /'Acara tidak ditemukan\.'/)
assert.match(exportSource, /'Gagal memuat data absensi\.'/)
assert.match(exportSource, /text\/csv;\s*charset=utf-8/)
assert.match(exportSource, /Content-Disposition/)
assert.match(exportSource, /attendance-\$\{params\.id\}\.csv/)
assert.match(exportSource, /\.limit\(/)
assert.match(exportSource, /from\('attendances'\)[\s\S]*\.eq\('event_id',\s*params\.id\)[\s\S]*\.limit\(/)
```

Jalankan: `bun run test:auth` — Expected: FAIL (file endpoint belum ada).

- [ ] **Step 2: Tambah `fetchEventAttendance` di `src/server/data/attendance.ts`**

Tambahkan di akhir file (impor `toCsv`/`CsvCell` TIDAK diperlukan di sini):

```ts
export type EventAttendanceRow = {
  user_id: string
  status: string | null
  method: string | null
  check_in_at: string | null
  profiles: { full_name: string | null; nim: string | null } | null
}

export async function fetchEventAttendance(supabase: SupabaseClient, eventId: string): Promise<EventAttendanceRow[]> {
  const { data: attendances, error } = await supabase
    .from('attendances')
    .select('user_id, status, method, check_in_at')
    .eq('event_id', eventId)
    .order('check_in_at', { ascending: true })
    .limit(10_000)
  if (error) throw new Error(`Gagal memuat data absensi: ${error.message}`)
  const rows = attendances ?? []
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, nim').in('id', userIds)
    : { data: [], error: null }
  if (profilesError) throw new Error(`Gagal memuat profil: ${profilesError.message}`)
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return rows.map((row) => ({ ...row, profiles: profilesById.get(row.user_id) ?? null }))
}
```

- [ ] **Step 3: Buat endpoint `src/routes/api/events/$id/attendance-export.ts`**

```ts
import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase-context'
import { responseWithCookies } from '~/server/request-auth'
import { withAdminApi } from '~/server/api-middleware'
import { fetchEventAttendance } from '~/server/data/attendance'
import { toCsv } from '~/lib/export/csv'

export const Route = createFileRoute('/api/events/$id/attendance-export')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const guard = await withAdminApi(request, { parseBody: false, requireSameOrigin: false })
        if (guard instanceof Response) return guard
        const { cookies } = guard
        const admin = createAdminClient()
        const { data: event, error: eventError } = await admin.from('events').select('id').eq('id', params.id).maybeSingle()
        if (eventError) return responseWithCookies({ error: 'Gagal memuat data absensi.' }, 500, cookies)
        if (!event) return responseWithCookies({ error: 'Acara tidak ditemukan.' }, 404, cookies)
        let rows: Awaited<ReturnType<typeof fetchEventAttendance>>
        try {
          rows = await fetchEventAttendance(admin, params.id)
        } catch {
          return responseWithCookies({ error: 'Gagal memuat data absensi.' }, 500, cookies)
        }
        const csv = toCsv(
          ['full_name', 'nim', 'check_in_at', 'status'],
          rows.map((row) => [row.profiles?.full_name ?? '', row.profiles?.nim ?? '', row.check_in_at ?? '', row.status ?? '']),
        )
        const headers = new Headers({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance-${params.id}.csv"`,
          'Cache-Control': 'no-store',
        })
        for (const cookie of cookies) headers.append('Set-Cookie', cookie)
        return new Response(csv, { status: 200, headers })
      },
    },
  },
})
```

- [ ] **Step 4: Regenerasi route tree & jalankan regresi (GREEN)**

Run:

```bash
bun run typecheck
bun run test:auth
```

Expected: typecheck bersih (route tree termutakhir otomatis saat typecheck/dev), `auth regression: PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/events/$id/attendance-export.ts src/server/data/attendance.ts scripts/test-auth.mjs
git commit -m "feat: add admin-only attendance CSV export endpoint"
```

Expected: commit berisi 3 file.

---

### Task 3: Tombol "Export CSV" di halaman detail acara

**Files:**
- Modify: `src/routes/_auth/events/$id/index.tsx` (kartu absensi admin + handler `exportCsv`)

**Interfaces:**
- Consumes: loader data `{ event, isAdmin, session, attendanceCount }`; endpoint `GET /api/events/$id/attendance-export` (200 CSV attachment; 403/404/500 JSON `{ error }`).
- Produces: klik tombol → `fetch` `Origin: window.location.origin` → response `ok` → trigger download via anchor blob → state `exporting` men-disable tombol; gagal → `setError(result?.error || 'Export gagal. Periksa koneksi lalu coba lagi.')`.

- [ ] **Step 1: Tambah state dan handler di `EventDetailPage`**

Setelah deklarasi `const [confirming, setConfirming] = useState(false)` tambahkan:

```tsx
const [exporting, setExporting] = useState(false)
```

Setelah fungsi `updateStatus` tambahkan handler:

```tsx
async function exportCsv() {
  setExporting(true)
  setError('')
  try {
    const response = await fetch(`/api/events/${event.id}/attendance-export`, { headers: { Origin: window.location.origin } })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      setError(result?.error || 'Export gagal. Periksa koneksi lalu coba lagi.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `attendance-${event.id}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch {
    setError('Export gagal. Periksa koneksi lalu coba lagi.')
  } finally {
    setExporting(false)
  }
}
```

- [ ] **Step 2: Tambah tombol di kartu absensi admin (bila `session` ada)**

Pada blok `{isAdmin && session ? (...)}`, ubah `<div>` deskripsi menjadi:

```tsx
<div>
  <p className="eyebrow text-(--accent-strong)">absensi sedang dibuka</p>
  <h2 className="mt-2 text-2xl font-black">{attendanceCount} mahasiswa sudah hadir</h2>
  <p className="mt-2 text-sm text-(--muted)">QR aktif—tampilkan kepada peserta.</p>
</div>
```

menjadi:

```tsx
<div>
  <p className="eyebrow text-(--accent-strong)">absensi sedang dibuka</p>
  <h2 className="mt-2 text-2xl font-black">{attendanceCount} mahasiswa sudah hadir</h2>
  <p className="mt-2 text-sm text-(--muted)">QR aktif—tampilkan kepada peserta.</p>
  <button
    type="button"
    onClick={exportCsv}
    disabled={exporting}
    className="mt-4 min-h-9 rounded-sm bg-(--accent-strong) px-4 text-sm font-bold text-white disabled:opacity-50"
  >
    {exporting ? 'Menyiapkan…' : 'Export CSV'}
  </button>
</div>
```

- [ ] **Step 3: Tambah tombol Export CSV untuk acara selesai (status `completed`)**

Pada blok admin actions (`{isAdmin ? (<section className="space-y-4 border-t border-(--border) pt-6">...)`), di dalam `<div className="flex flex-wrap gap-3">`, setelah rantai kondisi `event.status === 'draft' ? ... : event.status === 'active' ? ... : null` tambahkan sibling:

```tsx
{event.status === 'completed' ? (
  <button type="button" onClick={exportCsv} disabled={exporting} className="min-h-9 rounded-sm bg-(--accent-strong) px-4 text-sm font-bold text-white disabled:opacity-50">
    {exporting ? 'Menyiapkan…' : 'Export CSV'}
  </button>
) : null}
```

- [ ] **Step 4: Validasi UI**

Run:

```bash
bun run typecheck && bun run lint
```

Expected: keduanya bersih.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_auth/events/$id/index.tsx
git commit -m "feat: add Export CSV button on event detail page"
```

---

### Task 4: Validasi penuh, verifikasi manual, dan penutupan issue

- [ ] **Step 1: Gate penuh project**

Run:

```bash
bun run check
bun audit --audit-level=high
git diff --check
```

Expected: semua script regresi lulus, lint/typecheck/build bersih, audit tidak menemukan vuln level high, `git diff --check` tanpa output.

- [ ] **Step 2: Verifikasi manual end-to-end (butuh env dev berjalan)**

Jalankan dev server, login sebagai admin, buka acara dengan sesi aktif → klik "Export CSV" → file terunduh, terbuka benar di Excel/Sheets (kolom `full_name,nim,check_in_at,status`), baris cocok dengan DB. Ulangi pada acara `completed`. Buka endpoint sebagai user biasa → 403.

- [ ] **Step 3: Commit sisa perubahan (jika ada) dan tutup issue #46**

```bash
git status --short
git log --oneline -5
gh issue close 46 --comment "Selesai: endpoint admin-only GET /api/events/\$id/attendance-export (CSV UTF-8 BOM, RFC 4180, CRLF) + tombol Export CSV di halaman detail acara. Non-admin 403 (withAdminApi). Validasi: bun run check, bun audit, git diff --check lulus."
```

Expected: issue #46 closed.
