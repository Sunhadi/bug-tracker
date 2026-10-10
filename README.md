# Bug Tracker & Laporan Bulanan

Aplikasi web untuk mencatat dan melacak bug selama pengujian, sekaligus menyusun
laporan transparansi bulanan yang biasanya dibuat manual di spreadsheet.

Dua bagiannya:

- **Alat kerja QA** — CRUD bug, komentar, lampiran, riwayat status, pencarian dan
  filter, Board Kanban dengan drag and drop, serta test case beserta riwayat
  pass/fail.
- **Laporan bulanan** — tiga tab (Kategori Bug, Bug Klien, Scope Tambahan),
  dashboard KPI, tren per kategori, catatan yang bisa diedit langsung di halaman,
  export Excel enam sheet, dan gaya cetak.

Antarmuka mengikuti pola Jira (`To Do`, `In Progress`, `Board`, `Component`) dengan
satu warna aksen (`#0C66E4`) dan token gerak yang dipakai seluruh animasi.

## Stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, design token (palet Atlassian/Jira Cloud) |
| Database | PostgreSQL, Drizzle ORM 0.45, drizzle-kit |
| Auth | JWT (`jose`), hash password `bcryptjs`, cookie sesi httpOnly |
| UI | Radix UI, `cmdk` (command palette), `motion`, Font Awesome 7, Lucide React |
| Chart | Recharts 2 |
| Drag and drop | `@dnd-kit/core` |
| Berkas | ExcelJS (impor dan ekspor), Vercel Blob (lampiran) |
| Kualitas | ESLint 9, 28 pemeriksaan end-to-end, type-check saat build |

## Menjalankan

Butuh Node.js 20.12+ (untuk `process.loadEnvFile`) dan PostgreSQL 14+.

```bash
npm install
```

Salin `.env.example` jadi `.env.local`, lalu isi:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
AUTH_SECRET="<minimal 32 karakter>"
```

`AUTH_SECRET` dibuat dengan:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Buat database lalu jalankan migrasi:

```bash
createdb -U postgres bug_tracker
npm run db:migrate
npm run dev
```

Login dengan `admin@example.com` / `admin123`, atau buat akun sendiri lewat seed.

### Environment variable

| Nama | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Koneksi PostgreSQL. Di Vercel gunakan URL *pooled* untuk serverless. |
| `AUTH_SECRET` | ya | Kunci penandatangan token sesi. |
| `BLOB_READ_WRITE_TOKEN` | tidak | Tanpa itu fitur unggah lampiran nonaktif, sisanya tetap jalan. |
| `SEED_ADMIN_*` | tidak | Mengatur akun admin yang dibuat `npm run db:seed`. |

### Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (Turbopack) |
| `npm run build` | Build produksi |
| `npm start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate migrasi dari `db/schema.ts` |
| `npm run db:migrate` | Terapkan migrasi |
| `npm run db:push` | Sinkronkan skema tanpa file migrasi |
| `npm run db:seed` | Isi data awal |

## Struktur

```
app/
  (app)/                  Rute setelah login
    bugs/                 Daftar, Board, detail, buat issue
    test-cases/           Test case dan riwayat run
    laporan/              Trend, harian, dan bulanan (3 tab)
    pengaturan/           Kelola kategori bug
  api/                    Route handler, semua lewat requireUser
components/
  sidebar/                Sidebar: group, item, submenu, tooltip dan flyout
  laporan/                Komponen khusus laporan bulanan
  shell/                  TopBar, CommandPalette, provider
  ui.tsx                  Tombol, input, panel, chip, strip
lib/
  db.ts                   Koneksi Postgres (lazy)
  auth.ts                 Sesi JWT, requireUser, requireRole
  reports.ts              Agregasi laporan trend
  reports-bulanan.ts      Query dan pivot laporan bulanan
  import-rekap.ts         Parser workbook rekap bug
  nav.ts                  Struktur navigasi dan ikon
  jira.ts                 Nama dan warna Jira (sumber tunggal)
db/
  schema.ts               Skema Drizzle + relations
  seed.ts                 Seed admin dan data laporan
  migrations/             SQL migrasi
proxy.ts                  Proteksi rute (Next 16)
```

## Catatan teknis

Bagian-bagian ini yang sering jadi sumber bug kalau tidak diketahui.

**Tailwind hanya terdaftar untuk Turbopack.** `next.config.ts` mendaftarkan
`@tailwindcss/turbopack` di `turbopack.rules` dan repo ini tidak punya
`postcss.config.*`. Akibatnya `next build --webpack` selesai tanpa menghasilkan
satu pun utility Tailwind, jadi hasilnya tanpa gaya. `npm run dev` dan build
Turbopack di hosting tidak terpengaruh. Untuk membuat build webpack ikut
menghasilkan CSS, tambahkan `postcss.config.mjs` dengan plugin
`@tailwindcss/postcss`.

**Ukuran ikon Font Awesome wajib memakai modifier `!`.** Aturan
`.svg-inline--fa` milik Font Awesome mengatur `height: 1em; width: 1.25em`, dan
utility Tailwind kalah darinya karena utility berada di `@layer` sedangkan CSS
Font Awesome tidak. Tanpa modifier penting, ikon jadi 17,5 × 14 px dan tidak
persegi. Jadi ukurannya ditulis `h-4! w-4!`.

**Agregasi laporan dihitung di SQL.** `count`, `sum`, dan rata-rata semua
dihitung di PostgreSQL. Yang dikerjakan di JavaScript hanya pengelompokan baris
per tanggal atau per kategori, dan penjumlahan berjalan untuk nilai kumulatif.

**Tanggal laporan memakai `found_at`, bukan `created_at`.** `found_at` adalah
tanggal tiket dibuat di Jira atau tanggal ditemukan, dan selalu dibandingkan
dalam zona `Asia/Jakarta`.

**Jendela laporan diperluas 6 hari ke belakang.** Rentang laporan dimulai 6 hari
sebelum tanggal 1 bulan agar rata-rata 7 hari di awal bulan tidak bias. Pembagi
rata-rata dibatasi `GREATEST(1, LEAST(7, tanggal - tanggal_data_pertama + 1))`
supaya baris pertama tidak terlalu kecil.

**Definisi "Bug Belum Selesai" memakai status pengerjaan.** Item yang dihitung
adalah yang statusnya sudah masuk pengerjaan (`dikonfirmasi` atau `diperbaiki`),
apa pun `item_type`-nya. Item yang masih `baru` tidak dihitung. Ini supaya
angkanya sama dengan laporan acuan.

**Tanggal sel Excel dibaca dari bagian tanggal UTC.** ExcelJS mengubah nomor seri
menjadi instant UTC, jadi memakai tanggal lokal akan menggeser satu baris.

**Nilai localStorage dibaca lewat `useSyncExternalStore`.** `useState` dengan
initializer yang menyentuh `localStorage` membuat server merender nilai bawaan
sementara client merender nilai tersimpan, dan React memperingatkan soal
hydration.

**Panel samping sidebar diposisikan dengan `position: fixed`.** Wadah menu memakai
`overflow-x-hidden`, jadi panel yang diposisikan relatif akan terpotong. Posisi
diukur ulang saat panel dibuka, saat jendela digeser, dan saat menu di-scroll.

**`sql.join` tidak dipakai untuk daftar nilai.** `sql.join(array)` memasukkan array
sebagai SQL mentah, bukan parameter. Untuk `IN (...)` pakai `inArray` dari Drizzle.
Subquery daftar id juga harus lewat `inArray`, bukan `eq` dengan subquery, karena
`eq` menghasilkan `= (select ...)` yang ditolak Postgres kalau lebih dari satu
baris.

## Data seed laporan

`npm run db:seed` mengisi data laporan bulanan dari workbook rekap yang disimpan
di `db/seed-data/`. Berkas itu **tidak disertakan di repo ini** karena berisi data
klien. Tanpa berkas tersebut, seed bagian laporan akan berhenti; bagian seed
admin tetap berjalan.

Letakkan workbook di `db/seed-data/` dengan nama `rekap-bug.xlsx` untuk
mengaktifkannya. Formatnya mengikuti sheet `Daftar Bug`,
`Trend Kategori Bug + Tambahan`, dan `Tambahan Scope {Bulan Tahun}`.

## Lisensi

Tidak ada lisensi yang ditetapkan.