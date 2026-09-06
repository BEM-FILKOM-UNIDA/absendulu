# Standar Menulis Code untuk AI Agent

Dokumen ini **wajib dibaca sebelum AI agent menulis atau mengubah code** di repository ini. Tujuannya menjaga code tetap konsisten dengan TypeScript 5.9, Tailwind CSS v4, Vite, dan aturan linting yang digunakan project.

## 1. TypeScript dan `tsconfig.json`

- Jangan menambahkan `baseUrl` ke `tsconfig.json`. TypeScript menandainya deprecated dan akan menghentikan dukungan pada TypeScript 7.
- Gunakan `compilerOptions.paths` untuk alias import. Alias utama project adalah:

  ```json
  {
    "compilerOptions": {
      "paths": {
        "~/*": ["./src/*"]
      }
    }
  }
  ```

- Jangan menambahkan `ignoreDeprecations` secara spekulatif. Nilainya harus didukung oleh versi TypeScript yang terpasang; opsi yang berlaku di TypeScript 6 dapat error pada TypeScript 5.9.
- Setelah mengubah konfigurasi TypeScript, wajib jalankan:

  ```bash
  bun run typecheck
  ```

- Jangan mengganti alias `~/...` menjadi relative import tanpa alasan kuat. Pertahankan pola import yang sudah digunakan repository.

## 2. Tailwind CSS v4: gunakan class canonical

Tailwind CSS v4 menyediakan bentuk canonical yang lebih ringkas. Gunakan bentuk tersebut sejak awal agar Tailwind IntelliSense tidak menghasilkan warning `suggestCanonicalClasses`.

### CSS custom properties

Gunakan tanda kurung untuk CSS variable:

```tsx
// benar
<div className="bg-(--ink) text-(--lime) border-(--border)" />

// hindari
<div className="bg-[var(--ink)] text-[var(--lime)] border-[var(--border)]" />
```

Berlaku juga untuk variant, prefix, dan modifier opacity:

```tsx
<div className="hover:border-(--accent-strong) file:bg-(--accent) border-t-(--accent-strong) divide-(--border) bg-(--lime)/30" />
```

### Nilai yang sudah memiliki token Tailwind

Jika nilai memiliki utility canonical, gunakan utility tersebut:

```tsx
// benar
<div className="min-h-17 min-h-dvh w-67 max-w-90 rounded-sm aspect-4/3" />

// hindari
<div className="min-h-[68px] min-h-[100dvh] w-[268px] max-w-[360px] rounded-[4px] aspect-[4/3]" />
```

Contoh konversi umum:

| Hindari | Gunakan |
| --- | --- |
| `bg-[var(--color)]` | `bg-(--color)` |
| `text-[var(--color)]` | `text-(--color)` |
| `border-[var(--color)]` | `border-(--color)` |
| `divide-[var(--color)]` | `divide-(--color)` |
| `hover:border-[var(--color)]` | `hover:border-(--color)` |
| `hover:bg-[var(--color)]` | `hover:bg-(--color)` |
| `focus:border-[var(--color)]` | `focus:border-(--color)` |
| `focus:ring-[var(--color)]` | `focus:ring-(--color)` |
| `hover:bg-white/[.05]` | `hover:bg-white/5` |
| `min-h-[68px]` | `min-h-17` |
| `min-h-[100dvh]` | `min-h-dvh` |
| `min-w-[760px]` | `min-w-190` |
| `w-[268px]` | `w-67` |
| `max-w-[360px]` | `max-w-90` |
| `max-w-[220px]` | `max-w-55` |
| `max-w-[440px]` | `max-w-110` |
| `rounded-[4px]` | `rounded-sm` |
| `aspect-[4/3]` | `aspect-4/3` |
| `break-words` | `wrap-break-word` |
| `tracking-[.1em]` | `tracking-widest` |
| `tracking-[-.1em]` | `-tracking-widest` |
| `bg-[var(--color)]/30` | `bg-(--color)/30` |
| `bg-[var(--color)]/20` | `bg-(--color)/20` |

### Arbitrary values yang tetap diperbolehkan

Arbitrary value tetap boleh digunakan jika tidak ada utility canonical yang setara atau jika nilainya memang dinamis/spesifik desain:

```tsx
<div className="w-[72%]" />
<div className="pb-[max(env(safe-area-inset-bottom),.5rem)]" />
<div className="text-[9px]" />
```

Jangan mengganti arbitrary value secara membabi buta. Pastikan penggantian tidak mengubah ukuran, breakpoint, rasio, warna, atau perilaku layout.

### Nilai kustom yang tidak ditandai linter

Hanya ubah arbitrary value yang memang diperingatkan oleh Tailwind IntelliSense (`suggestCanonicalClasses`). Nilai kustom yang sengaja dipilih dan **tidak** ditandai linter harus dibiarkan, karena tidak ada token canonical yang nilainya setara:

```tsx
// dibiarkan: -0.07em adalah nilai desain kustom, bukan tracking-widest (0.1em)
<h1 className="display-type tracking-[-.07em]" />
```

Hindari salah konversi seperti `tracking-[-.07em]` → `-tracking-widest`; keduanya menghasilkan letter-spacing yang berbeda.

### Riwayat perbaikan (kasus nyata)

Pada file berikut, warning `suggestCanonicalClasses` terjadi dan sudah dikonversi ke bentuk canonical — jangan tulis ulang pola lama ini:

- `src/routes/_auth/events/$id.tsx`
- `src/routes/_auth/events/$id/qr.tsx`
- `src/routes/_auth/events/new.tsx`
- `src/routes/_auth/mahasiswa.tsx` — `border-(--border)`, `text-(--accent-strong)`, `text-(--muted)`, `divide-(--border)`, `hover:bg-(--surface-muted)`, `bg-(--ink)`, `tracking-widest`
- `src/routes/_auth/members.tsx` — `border-(--border)`, `text-(--accent-strong)`, `text-(--muted)`, `text-(--danger)`, `bg-(--surface-muted)`, `divide-(--border)`, `tracking-widest`, `min-w-190`, `rounded-sm`, `bg-(--danger)`, `bg-(--accent-strong)`
- `src/routes/_auth/profile.tsx` — `border-(--border)`, `text-(--accent-strong)`, `bg-(--ink)`, `bg-(--accent)`, `text-(--ink)`, `text-(--accent)`, `wrap-break-word`, `bg-(--border)`, `bg-(--surface)`, `text-(--muted-soft)`, `bg-(--surface-strong)`, `bg-(--surface-muted)`, `border-(--accent-strong)`, `bg-(--accent-soft)`, `text-(--danger)`, `rounded-sm`
- `src/routes/index.tsx` — `bg-(--ink)`, `bg-(--paper)`, `text-(--muted)`, `border-(--ink)`, `hover:border-(--accent-strong)`, `hover:text-(--accent-strong)`, `text-(--accent-strong)`, `bg-(--accent)`, `text-(--ink)`, `text-(--accent-foreground)`, `text-(--muted-soft)`, `bg-(--lime)`, `text-(--accent)`, `text-(--lime)`, `-tracking-widest`, `max-w-55`, `border-(--border)`, `bg-(--surface)`, `rounded-sm`
- `src/routes/login.tsx` — `min-h-dvh`, `bg-(--paper)`, `bg-(--accent)`, `bg-(--lime)/30`, `text-(--muted)`, `border-(--ink)`, `bg-(--surface)`, `bg-(--ink)`, `text-(--accent)`, `border-(--accent-strong)`, `bg-(--accent-soft)`, `text-(--accent-strong)`, `border-(--border)`, `hover:bg-(--surface-muted)`, `text-(--muted-soft)`, `bg-(--border)`, `bg-(--surface-strong)`, `focus:border-(--accent-strong)`, `focus:ring-(--accent-soft)`, `text-(--danger)`, `rounded-sm`, `text-(--accent-foreground)`
- `src/routes/waiting-approval.tsx` — `bg-(--paper)`, `text-(--muted)`, `min-h-dvh`, `border-(--ink)`, `bg-(--ink)`, `text-(--lime)`, `text-(--accent-strong)`, `tracking-widest`, `hover:text-(--accent-strong)`
- `src/routes/_auth/scan.tsx`, `src/routes/_auth/events.tsx`, `src/routes/_auth/dashboard.tsx`, `src/routes/_auth/attendance/history.tsx`, `src/components/member-import-form.tsx`, `src/components/ui.tsx`, `src/components/app-shell.tsx`, `src/components/route-fallbacks.tsx`, `src/components/attendance/QRScanner.tsx`, `src/routes/complete-profile.tsx`, `src/routes/account-disabled.tsx`

Kasus yang diperbaiki (daftar lengkap agar tidak terulang):

- `border-[var(--border)]` → `border-(--border)` — termasuk `hover:`, `focus:`, `divide-`, `border-t-`
- `text-[var(--muted-soft)]` → `text-(--muted-soft)`
- `text-[var(--muted)]` → `text-(--muted)`
- `text-[var(--accent-strong)]` → `text-(--accent-strong)` — termasuk `hover:text-`
- `text-[var(--accent)]` → `text-(--accent)`
- `text-[var(--accent-foreground)]` → `text-(--accent-foreground)`
- `text-[var(--lime)]` → `text-(--lime)`
- `text-[var(--danger)]` → `text-(--danger)`
- `text-[var(--ink)]` → `text-(--ink)`
- `text-[var(--paper)]` → `text-(--paper)`
- `bg-[var(--accent-soft)]` → `bg-(--accent-soft)`
- `bg-[var(--accent)]` → `bg-(--accent)`
- `bg-[var(--accent-strong)]` → `bg-(--accent-strong)`
- `bg-[var(--ink)]` → `bg-(--ink)`
- `bg-[var(--paper)]` → `bg-(--paper)`
- `bg-[var(--surface)]` → `bg-(--surface)`
- `bg-[var(--surface-strong)]` → `bg-(--surface-strong)`
- `bg-[var(--surface-muted)]` → `bg-(--surface-muted)` — termasuk `hover:bg-`
- `bg-[var(--border)]` → `bg-(--border)`
- `bg-[var(--danger)]` → `bg-(--danger)` dan `bg-(--danger)/20`
- `bg-[var(--lime)]` → `bg-(--lime)` dan `bg-(--lime)/30`
- `border-[var(--accent-strong)]` → `border-(--accent-strong)` — termasuk `hover:`, `focus:`
- `border-[var(--danger)]` → `border-(--danger)`
- `border-[var(--ink)]` → `border-(--ink)`
- `border-t-[var(--accent-strong)]` → `border-t-(--accent-strong)`
- `divide-[var(--border)]` → `divide-(--border)`
- `break-words` → `wrap-break-word`
- `rounded-[4px]` → `rounded-sm`
- `max-w-[440px]` → `max-w-110`, `max-w-[220px]` → `max-w-55`, `min-w-[760px]` → `min-w-190`
- `min-h-[100dvh]` → `min-h-dvh`, `min-h-[68px]` → `min-h-17`, `w-[268px]` → `w-67`, `max-w-[360px]` → `max-w-90`, `aspect-[4/3]` → `aspect-4/3`
- `tracking-[.1em]` → `tracking-widest`, `tracking-[-.1em]` → `-tracking-widest`
- `hover:bg-white/[.05]` → `hover:bg-white/5`

Sedangkan `tracking-[-.07em]`, `tracking-[-.06em]`, `tracking-[-.05em]`, `tracking-[-.03em]`, `tracking-[.18em]`, `tracking-[.14em]`, `tracking-[.12em]` di heading/nav sengaja dibiarkan karena tidak ditandai linter — tidak ada token canonical yang nilainya setara (lihat bagian sebelumnya).

## 3. Aturan perubahan UI

- Pertahankan class semantic/custom yang sudah ada, seperti `eyebrow`, `display-type`, `paper-noise`, `qr-camera-shell`, dan `qr-scan-guide`.
- Jangan mengubah class hanya untuk memperpendeknya jika tidak ada warning atau manfaat konsistensi yang jelas.
- Untuk JSX dengan class string panjang, lakukan perubahan kecil dan terarah. Jangan menulis ulang satu file hanya untuk mengganti class.
- Setelah mengubah class Tailwind, cek file yang berubah dengan pencarian berikut:

  ```bash
  grep -rnE 'var\(--|aspect-\[|max-w-\[|rounded-\[|min-h-\[|lg:h-\[|hover:bg-white/\[|break-words|tracking-\[\.1em\]|tracking-\[-\.1em\]' \\
    src/components src/routes
  ```

  Hasil pencarian harus ditinjau manual; tidak semua arbitrary value adalah warning.

## 4. Validasi wajib sebelum menyelesaikan pekerjaan

Untuk perubahan TypeScript, React, konfigurasi, atau Tailwind, jalankan minimal:

```bash
bun run typecheck
bun run lint
bun run build
```

Jika perubahan menyentuh behavior, jalankan test yang relevan. Untuk validasi penuh project:

```bash
bun run check
bun audit --audit-level=high
git diff --check
```

AI agent tidak boleh menyatakan pekerjaan selesai jika `typecheck`, `lint`, atau `build` gagal. Jika editor masih menampilkan warning setelah validasi CLI, bedakan antara:

1. error nyata yang harus diperbaiki;
2. warning IntelliSense yang valid karena arbitrary value memang diperlukan; atau
3. masalah cache editor yang perlu reload window.

## 5. Checklist singkat AI agent

Sebelum mengakhiri perubahan code, pastikan:

- [ ] Tidak menambahkan `baseUrl` ke `tsconfig.json`.
- [ ] Tidak menambahkan `ignoreDeprecations` yang tidak didukung versi TypeScript project.
- [ ] CSS variable Tailwind memakai bentuk `(--variable)` — termasuk `divide-`, `hover:`, dan modifier lain.
- [ ] Utility dengan token canonical tidak ditulis sebagai arbitrary pixel/value.
- [ ] `break-words` memakai `wrap-break-word`, bukan `break-words`.
- [ ] Letter-spacing memakai `tracking-widest`/`-tracking-widest`, bukan `tracking-[.1em]`/`tracking-[-.1em]`.
- [ ] Arbitrary value yang tersisa memang diperlukan dan sudah ditinjau.
- [ ] `bun run typecheck` berhasil.
- [ ] `bun run lint` berhasil.
- [ ] `bun run build` berhasil.
- [ ] `git diff --check` berhasil.
