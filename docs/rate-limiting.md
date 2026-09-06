# Rate Limiting

Absendulu tidak mengimplementasikan rate limiting di application layer. Dokumen ini menjelaskan alasannya dan cara mengaktifkan proteksi jika diperlukan.

## Strategi saat ini

| Endpoint | Risiko | Proteksi yang ada |
|---|---|---|
| `POST /api/attendance/check-in` | Burst tinggi saat event (banyak user scan bersamaan) | Auth session wajib, duplicate-attendance trigger, Vercel DDoS mitigation |
| `POST /api/members/import` | Auth user creation massal | Admin-only, batas 500 baris + 2 MB per request |
| `POST /api/members/manual` | Auth user creation satu per satu | Admin-only |
| `POST /api/events` | Event creation | Admin-only |
| Semua mutation lain | — | Same-origin check + admin guard |

Login (magic link & Google OAuth) dikelola Supabase Auth yang sudah punya built-in rate limiting per email dan per IP.

## Mengaktifkan rate limiting jika diperlukan

### Vercel (tanpa code deploy)

1. Buka **Vercel Dashboard → Project → Security → Attack Challenge Mode**
2. Tambah rule baru: path `/api/*`, limit sesuai kebutuhan
3. Aktif dalam hitungan menit tanpa redeploy

### Edge Middleware (perlu code)

Tambahkan `src/middleware.ts` dengan `@vercel/edge-rate-limit` atau implementasi counter sederhana berbasis KV store. Scope per endpoint path + user ID untuk akurasi.

## Kapan perlu diaktifkan

- Jika terdeteksi pola abuse di Vercel Analytics atau Supabase logs
- Jika event sangat besar (>500 peserta scan dalam waktu bersamaan) dan latency check-in meningkat
- Jika akun admin dikompromikan dan perlu pembatasan darurat
