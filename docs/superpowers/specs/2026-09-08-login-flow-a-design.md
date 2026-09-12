# Login Flow A — Google-only Auto-Aktif (70+ serentak)

**Tanggal:** 2026-09-08
**Status:** Approved
**Konteks:** Absendulu FILKOM, 70+ mahasiswa login barengan. Magic Link kena `rate limit` Supabase (tidak bisa serentak). Invite-only lama butuh admin input 70 NIM manual. Pilihan: B Gmail campur + NIM manual, langsung Aktif (tanpa waiting-approval), Google primary.

## Arsitektur

Perubahan cuma 2 file:
- `src/routes/auth/callback.ts` — auto `nim` + `active` saat self-register
- `src/routes/login.tsx` — hapus form Magic Link, cuma Google (native OAuth, tidak kena Supabase email limit)

`waiting-approval` tetap ada tapi jarang dipakai (hanya untuk email non-`I.#######` yang harus isi form).

## Data Flow

1. Klik `Masuk dengan Google` → `supabase.auth.exchangeCodeForSession` → `callback` dapat `user.email`.
2. Cek `profiles` where `id=user.id`:
   - Belum ada + `email` local part `i.#######` cocok `^I\.[0-9]{7}$` → `insert {nim: I.#######, status: active, is_active:true, nim_format_legacy:false}` → redirect `/mahasiswa` atau `next`
   - Belum ada + tidak cocok → `insert {nim: AUTH-..., status: invited}` → redirect `/complete-profile`
   - Sudah ada `AUTH-...` → `redirect /complete-profile`
   - Sudah ada `invited` + NIM valid → `redirect /complete-profile` (isi NIM) → `PATCH /api/profile` → setelah valid, `update account_status='active'` (1 baris baru di `/api/profile`) → `/mahasiswa`
3. `/_auth` beforeLoad: `GENERATED_IDENTIFIER_PATTERN` → `complete-profile` (bukan `login?unprovisioned`), `account_status !== active` → `complete-profile`.

## Error Handling

- `insert` duplicate → idempoten `redirect /complete-profile`, bukan `?error=profile`
- `complete-profile` NIM tidak valid → stay di form dengan pesan `Format wajib: I.#######`
- `waiting-approval` hanya untuk yang masih `invited` + NIM sudah valid tapi belum di-`active` (sekarang jarang, karena auto `active` untuk `i.#######`)

## Testing

- `bun run test:auth` + `test:schedule` tetap pass
- Tambah case: `callback` dengan `i.2510152@unida.ac.id` → `active`, `random@gmail.com` → `invited` → `complete-profile`

## Ponytail

- 1 branch di `callback`, no new dep, native Google OAuth.
- `waiting-approval` tetap ada tapi `ponytail: jarang dipakai untuk A, keep until next event`.


