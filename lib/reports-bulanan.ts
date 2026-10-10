import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportNotes } from "@/db/schema";

/**
 * Agregasi laporan bulanan (Kategori Bug, Bug Klien, Scope Tambahan).
 *
 * Semua angka dihitung di SQL; JavaScript hanya meng-pivot hasil dan
 * menghitung persentase dari total yang sudah dihitung SQL.
 *
 * Tanggal laporan memakai found_at (tanggal tiket dibuat di Jira atau tanggal
 * ditemukan) dan selalu dibandingkan dalam zona Asia/Jakarta.
 */

export interface OpsiBulanan {
  /** "2026-08" */
  bulan: string;
  /** null berarti semua project digabung. */
  projectId: number | null;
  /**
   * true  = hitung bug + temuan tambahan (padanan sheet "+ Tambahan")
   * false = hanya item_type = 'bug' (padanan sheet "Trend Kategori Bug")
   */
  sertakanTambahan: boolean;
  /**
   * Tanggal pertama yang dihitung, format YYYY-MM-DD.
   *
   * Normally sama dengan tanggal 1 bulan yang dipilih. Ada satu pengecualian
   * yang mengikuti file acuan: jendela laporan diperluas 6 hari ke belakang,
   * sesuai bagian 10.4 dokumen ("rentang diperluas 6 hari ke belakang supaya
   * rata-rata 7 hari di awal bulan benar"). Tanpa itu, tabel harian di Excel
   * "Agustus 2026" yang dimulai dari 30 Juli 2026 tidak ikut terhitung,
   * padahal bagian 14 menyebut baris "30 Jul bug baru 2 (Baseline, avg 2)"
   * dan "31 Jul bug baru 6 (Naik, avg 4)" sebagai bagian laporan Agustus.
   *
   * Diisi oleh siapkanOpsi(). Kalau kosong, dipakai tanggal 1 bulan.
   */
  awalEfektif?: string;
  /**
   * Tanggal paling awal yang punya data di dalam jendela. Dipakai sebagai
   * pembagi rata-rata 7 hari supaya hari pertama tidak terlalu kecil.
   */
  pertamaData?: string;
}

/** Batas mundur maksimum sebelum tanggal 1 bulan. */
const MUNDUR_MAKS = 6;

function batasAkhir(bulan: string): string {
  const d = new Date(`${bulan}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function mundur(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - hari);
  return d.toISOString().slice(0, 10);
}

/**
 * Susun OpsiBulanan lengkap dengan tanggal awal yang benar.
 * Semua query laporan bulanan sebaiknya lewat fungsi ini.
 */
export async function siapkanOpsi(
  bulan: string,
  projectId: number | null,
  sertakanTambahan = false
): Promise<OpsiBulanan> {
  const awal = mundur(`${bulan}-01`, MUNDUR_MAKS);
  const hasil = rows<{ pertama: string | null }>(
    await db.execute(sql`
      SELECT to_char(min((found_at AT TIME ZONE 'Asia/Jakarta')::date), 'YYYY-MM-DD') AS pertama
      FROM bugs
      WHERE exclude_from_analysis = false
        AND (${projectId}::int IS NULL OR project_id = ${projectId})
        AND (found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (found_at AT TIME ZONE 'Asia/Jakarta')::date <  ${batasAkhir(bulan)}::date
    `)
  );
  const pertama = hasil[0]?.pertama ? String(hasil[0].pertama).slice(0, 10) : null;
  return {
    bulan,
    projectId,
    sertakanTambahan,
    awalEfektif: awal,
    // Kalau tidak ada data sama sekali, pakai tanggal 1 bulan supaya tabel
    // harian tetap menampilkan seluruh bulan tanpa baris tambahan.
    pertamaData: pertama ?? `${bulan}-01`,
  };
}

function rows<T>(result: unknown): T[] {
  return Array.from(result as Iterable<T>);
}

/** count() dari Postgres datang sebagai string; pastikan jadi number. */
function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ============ KATEGORI & PROYEK ============

export interface Kategori {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export async function getKategori(): Promise<Kategori[]> {
  return rows<Kategori>(
    await db.execute(sql`
      SELECT id, name, color, sort_order, is_active
      FROM bug_categories
      WHERE is_active = true
      ORDER BY sort_order, name
    `)
  );
}

export interface Proyek {
  id: number;
  name: string;
}

export async function getProyek(): Promise<Proyek[]> {
  return rows<Proyek>(
    await db.execute(sql`
      SELECT id, name FROM projects ORDER BY name
    `)
  );
}

// ============ 10.1 JUMLAH PER KATEGORI ============

export interface BarisKategori extends Kategori {
  kategori: string;
  jumlah: number;
  /** Persentase 0..100, satu desimal. */
  persen: number;
}

export async function getJumlahPerKategori(
  opts: OpsiBulanan
): Promise<BarisKategori[]> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;
  const tambahan = opts.sertakanTambahan;

  const hasil = rows<{
    id: number | null;
    name: string | null;
    color: string | null;
    sort_order: number | null;
    kategori: string;
    jumlah: number;
  }>(
    await db.execute(sql`
      SELECT c.id, c.name, c.color, c.sort_order,
             COALESCE(c.name, '(Belum dikategorikan)') AS kategori,
             count(*)::int AS jumlah
      FROM bugs b
      LEFT JOIN bug_categories c ON c.id = b.category_id
      WHERE b.exclude_from_analysis = false
        AND (${p}::int IS NULL OR b.project_id = ${p})
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
        AND (${tambahan}::boolean OR b.item_type = 'bug')
      GROUP BY c.id, c.name, c.color, c.sort_order
      ORDER BY jumlah DESC, kategori
    `)
  );

  const total = hasil.reduce((s, r) => s + num(r.jumlah), 0);
  return hasil.map((r) => ({
    id: r.id ?? -1,
    name: r.kategori,
    color: r.color ?? "#626F86",
    sortOrder: r.sort_order ?? 0,
    isActive: true,
    kategori: r.kategori,
    jumlah: num(r.jumlah),
    persen: total > 0 ? (num(r.jumlah) / total) * 100 : 0,
  }));
}

// ============ 10.2 TREND PER TANGGAL DIBUAT ============

export interface BarisTanggal {
  tanggal: string;
  total: number;
  /**<Key kategori, jumlah pada tanggal itu. */
  perKategori: Record<string, number>;
}

/**
 * Pivot hasil §10.2 menjadi satu baris per tanggal.
 * Query mengembalikan satu baris per tanggal; tabel di halaman memakai hasil
 * ini apa adanya, jadi tanggal tanpa data tidak muncul (sama seperti Excel).
 */
export async function getTrendDibuat(
  opts: OpsiBulanan
): Promise<BarisTanggal[]> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;
  const tambahan = opts.sertakanTambahan;

  const mentah = rows<{ tanggal: string; kategori: string; jumlah: number }>(
    await db.execute(sql`
      SELECT to_char((b.found_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS tanggal,
             COALESCE(c.name, '(Belum dikategorikan)') AS kategori,
             count(*)::int AS jumlah
      FROM bugs b
      LEFT JOIN bug_categories c ON c.id = b.category_id
      WHERE b.exclude_from_analysis = false
        AND (${p}::int IS NULL OR b.project_id = ${p})
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
        AND (${tambahan}::boolean OR b.item_type = 'bug')
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)
  );

  const peta = new Map<string, BarisTanggal>();
  for (const r of mentah) {
    const tanggal = String(r.tanggal).slice(0, 10);
    let baris = peta.get(tanggal);
    if (!baris) {
      baris = { tanggal, total: 0, perKategori: {} };
      peta.set(tanggal, baris);
    }
    const n = num(r.jumlah);
    baris.perKategori[r.kategori] = n;
    baris.total += n;
  }
  return [...peta.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

// ============ 10.3 PENYELESAIAN PER TANGGAL SELESAI ============

export interface BarisSelesai {
  tanggal: string;
  selesai: number;
  kumulatif: number;
  perKategori: Record<string, number>;
}

export async function getTrendSelesai(
  opts: OpsiBulanan
): Promise<BarisSelesai[]> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;

  const mentah = rows<{ tanggal: string; kategori: string; selesai: number }>(
    await db.execute(sql`
      SELECT to_char((b.closed_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS tanggal,
             COALESCE(c.name, '(Belum dikategorikan)') AS kategori,
             count(*)::int AS selesai
      FROM bugs b
      LEFT JOIN bug_categories c ON c.id = b.category_id
      WHERE b.closed_at IS NOT NULL
        AND b.item_type = 'bug'
        AND b.exclude_from_analysis = false
        AND (${p}::int IS NULL OR b.project_id = ${p})
        AND (b.closed_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (b.closed_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)
  );

  // Pivot per tanggal; jumlah dan kumulatifnya dijumlahkan di sini supaya
  // tidak perlu window function yang harus mengulang kolom.
  const peta = new Map<string, BarisSelesai>();
  for (const r of mentah) {
    const tanggal = String(r.tanggal).slice(0, 10);
    let baris = peta.get(tanggal);
    if (!baris) {
      baris = { tanggal, selesai: 0, kumulatif: 0, perKategori: {} };
      peta.set(tanggal, baris);
    }
    const n = num(r.selesai);
    baris.selesai += n;
    baris.perKategori[r.kategori] = (baris.perKategori[r.kategori] ?? 0) + n;
  }

  const urut = [...peta.values()].sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal)
  );
  let jalan = 0;
  for (const b of urut) {
    jalan += b.selesai;
    b.kumulatif = jalan;
  }
  return urut;
}

// ============ DETAIL ITEM ============

export interface ItemLaporan {
  id: number;
  code: string | null;
  jiraKey: string | null;
  jiraUrl: string | null;
  title: string;
  kategori: string;
  kategoriId: number | null;
  warnaKategori: string;
  area: string;
  tanggal: string;
  priority: number;
  status: string;
  itemType: string;
  actionNote: string | null;
  picName: string | null;
  fixVersion: string | null;
}

interface BarisItem {
  id: number;
  code: string | null;
  jira_key: string | null;
  jira_url: string | null;
  title: string;
  kategori: string;
  category_id: number | null;
  warna: string | null;
  area: string | null;
  tanggal: string;
  priority: number;
  status: string;
  item_type: string;
  action_note: string | null;
  pic_name: string | null;
  fix_version: string | null;
}

function keItem(r: BarisItem): ItemLaporan {
  return {
    id: r.id,
    code: r.code,
    jiraKey: r.jira_key,
    jiraUrl: r.jira_url,
    title: r.title,
    kategori: r.kategori,
    kategoriId: r.category_id,
    warnaKategori: r.warna ?? "#626F86",
    area: r.area ?? "",
    tanggal: String(r.tanggal).slice(0, 10),
    priority: num(r.priority),
    status: r.status,
    itemType: r.item_type,
    actionNote: r.action_note,
    picName: r.pic_name,
    fixVersion: r.fix_version,
  };
}

export async function getDetailItem(opts: OpsiBulanan): Promise<ItemLaporan[]> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;
  const tambahan = opts.sertakanTambahan;

  const hasil = rows<BarisItem>(
    await db.execute(sql`
      SELECT b.id, b.code, b.jira_key, b.jira_url, b.title,
             COALESCE(c.name, '(Belum dikategorikan)') AS kategori,
             b.category_id, c.color AS warna, m.name AS area,
             to_char((b.found_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS tanggal,
             b.priority, b.status, b.item_type, b.action_note,
             b.pic_name, b.fix_version
      FROM bugs b
      LEFT JOIN bug_categories c ON c.id = b.category_id
      LEFT JOIN modules m ON m.id = b.module_id
      WHERE b.exclude_from_analysis = false
        AND (${p}::int IS NULL OR b.project_id = ${p})
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
        AND (${tambahan}::boolean OR b.item_type = 'bug')
      ORDER BY b.found_at, b.id
    `)
  );
  return hasil.map(keItem);
}

export interface ItemDikecualikan extends ItemLaporan {
  excludeReason: string | null;
}

export async function getDikecualikan(
  opts: OpsiBulanan
): Promise<ItemDikecualikan[]> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;

  const hasil = rows<BarisItem & { exclude_reason: string | null }>(
    await db.execute(sql`
      SELECT b.id, b.code, b.jira_key, b.jira_url, b.title,
             COALESCE(c.name, '(Belum dikategorikan)') AS kategori,
             b.category_id, c.color AS warna, m.name AS area,
             to_char((b.found_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS tanggal,
             b.priority, b.status, b.item_type, b.action_note,
             b.pic_name, b.fix_version, b.exclude_reason
      FROM bugs b
      LEFT JOIN bug_categories c ON c.id = b.category_id
      LEFT JOIN modules m ON m.id = b.module_id
      WHERE b.exclude_from_analysis = true
        AND (${p}::int IS NULL OR b.project_id = ${p})
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
      ORDER BY b.code NULLS LAST, b.id
    `)
  );
  return hasil.map((r) => ({ ...keItem(r), excludeReason: r.exclude_reason }));
}

// ============ SUBJUDUL OTOMATIS §8.2 ============

export interface SubjudulAnalisis {
  jira: number;
  tambahan: number;
  total: number;
  excluded: number;
  selesai: number;
  belumSelesai: number;
}

export async function getSubjudulAnalisis(
  opts: OpsiBulanan
): Promise<SubjudulAnalisis> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;

  const hasil = rows<{
    jira: number;
    tambahan: number;
    total: number;
    excluded: number;
    selesai: number;
    belum_selesai: number;
  }>(
    await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE NOT exclude_from_analysis
                           AND source = 'jira')::int                   AS jira,
        count(*) FILTER (WHERE NOT exclude_from_analysis
                           AND source <> 'jira')::int                  AS tambahan,
        count(*) FILTER (WHERE NOT exclude_from_analysis)::int        AS total,
        count(*) FILTER (WHERE exclude_from_analysis)::int            AS excluded,
        count(*) FILTER (WHERE NOT exclude_from_analysis
                           AND status = 'selesai')::int                AS selesai,
        count(*) FILTER (WHERE NOT exclude_from_analysis
                           AND status <> 'selesai')::int               AS belum_selesai
      FROM bugs
      WHERE (${p}::int IS NULL OR project_id = ${p})
        AND (found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
    `)
  );
  const r = hasil[0];
  return {
    jira: num(r?.jira),
    tambahan: num(r?.tambahan),
    total: num(r?.total),
    excluded: num(r?.excluded),
    selesai: num(r?.selesai),
    belumSelesai: num(r?.belum_selesai),
  };
}

// ============ 10.4 SERI HARIAN LAPORAN KLIEN ============

export interface BarisHarian {
  tanggal: string;
  bugBaru: number;
  nonBug: number;
  total: number;
  avg7: number;
  arah: "baseline" | "naik" | "turun" | "stabil";
}

export async function getHarianKlien(
  opts: OpsiBulanan
): Promise<BarisHarian[]> {
  // Jendela ditampilkan mulai tanggal 1 bulan, atau lebih awal kalau ada data
  // di hari-hari sebelum bulan itu (file acuan "Agustus 2026" memuat baris
  // 30 Jul dan 31 Jul). Seri internally dimulai 6 hari lebih awal supaya
  // rata-rata 7 hari di awal bulan tidak bias.
  const mulai = `${opts.bulan}-01`;
  const seriMulai = opts.awalEfektif ?? mulai;
  const pertama = opts.pertamaData ?? seriMulai;
  const akhir = batasAkhir(opts.bulan);
  const p = opts.projectId;

  const hasil = rows<{
    tanggal: string;
    bug_baru: number;
    non_bug: number;
    total: number;
    avg7: number | null;
    arah: string;
  }>(
    await db.execute(sql`
      WITH hari AS (
        SELECT d::date AS tanggal
        FROM generate_series(${seriMulai}::date, (${akhir}::date - 1)::date, interval '1 day') d
      ),
      harian AS (
        SELECT (b.found_at AT TIME ZONE 'Asia/Jakarta')::date AS tanggal,
               count(*) FILTER (WHERE b.item_type = 'bug')::int  AS bug_baru,
               count(*) FILTER (WHERE b.item_type <> 'bug')::int AS non_bug
        FROM bugs b
        WHERE b.exclude_from_analysis = false
          AND (${p}::int IS NULL OR b.project_id = ${p})
        GROUP BY 1
      ),
      seri AS (
        SELECT h.tanggal,
               COALESCE(x.bug_baru, 0) AS bug_baru,
               COALESCE(x.non_bug, 0)  AS non_bug,
               -- Pembagi dibatasi 7 dan tidak pernah kurang dari jumlah hari
               -- sejak data pertama, jadi baris pertama tidak terlalu kecil.
               round(
                 sum(COALESCE(x.bug_baru, 0)) OVER (
                   ORDER BY h.tanggal ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                 )::numeric
                 / GREATEST(1, LEAST(7, (h.tanggal - ${pertama}::date) + 1))::numeric,
                 2
               ) AS avg7,
               lag(COALESCE(x.bug_baru, 0)) OVER (ORDER BY h.tanggal) AS kemarin
        FROM hari h LEFT JOIN harian x USING (tanggal)
      )
      SELECT to_char(tanggal, 'YYYY-MM-DD') AS tanggal,
             bug_baru, non_bug, (bug_baru + non_bug) AS total, avg7,
             CASE WHEN kemarin IS NULL THEN 'baseline'
                  WHEN bug_baru > kemarin THEN 'naik'
                  WHEN bug_baru < kemarin THEN 'turun'
                  ELSE 'stabil' END AS arah
      FROM seri
      WHERE tanggal >= LEAST(${pertama}::date, ${mulai}::date)
      ORDER BY tanggal
    `)
  );

  // Hari pertama tabel selalu "Baseline": tidak ada baris pembanding di atasnya.
  return hasil.map((r, i) => ({
    tanggal: String(r.tanggal).slice(0, 10),
    bugBaru: num(r.bug_baru),
    nonBug: num(r.non_bug),
    total: num(r.total),
    avg7: num(r.avg7),
    arah: (i === 0 ? "baseline" : r.arah) as BarisHarian["arah"],
  }));
}

// ============ 10.5 KPI KLIEN ============

export interface KpiKlien {
  totalBug: number;
  bug7Terakhir: number;
  bug7Sebelumnya: number;
  perubahan: number | null;
  belumSelesai: number;
  selesai: number;
  resolutionRate: number | null;
  /** Tanggal acuan yang dipakai. */
  tanggalAcuan: string;
  /** Rentang 7 hari terakhir, contoh "13-19 Agustus 2026". */
  rentangTerakhir: string;
  rentangSebelumnya: string;
}

/**
 * Tanggal acuan: hari terakhir bulan yang punya data, atau hari ini kalau
 * bulan yang dipilih sedang berjalan.
 */
export async function getTanggalAcuan(
  opts: OpsiBulanan
): Promise<string> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;

  const hasil = rows<{ terakhir: string | null; hari_ini: string }>(
    await db.execute(sql`
      SELECT
        to_char(max((b.found_at AT TIME ZONE 'Asia/Jakarta')::date), 'YYYY-MM-DD') AS terakhir,
        to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS hari_ini
      FROM bugs b
      WHERE b.exclude_from_analysis = false
        AND (${p}::int IS NULL OR b.project_id = ${p})
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (b.found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
    `)
  );
  const r = hasil[0];
  const hariIniBulan = String(r?.hari_ini ?? "").slice(0, 7);
  if (opts.bulan === hariIniBulan) return String(r?.hari_ini ?? "").slice(0, 10);
  return String(r?.terakhir ?? `${opts.bulan}-01`).slice(0, 10);
}

function geserHari(tanggal: string, n: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function namaRentang(dari: string, sampai: string): string {
  const fmt = (s: string, denganTahun: boolean) => {
    const d = new Date(`${s}T00:00:00Z`);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      ...(denganTahun ? { year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(d);
  };
  const samaBulan = dari.slice(0, 7) === sampai.slice(0, 7);
  return `${fmt(dari, !samaBulan)} - ${fmt(sampai, true)}`;
}

/**
 * KPI klien.
 *
 * Catatan definisi "Bug Belum Selesai":
 * dokumen §10.5 menuliskan `item_type='bug' AND status NOT IN
 * ('selesai','ditolak')`, tetapi angka acuan §14 (dan kolom Keterangan di
 * file Excel) menyebut 2 item yang "masih On Progress". Dua item itu di file
 * Excel bertipe Operational dan Penyesuaian, bukan bug, jadiquery harfiahnya
 * menghasilkan 0 dan resolution rate 100%.
 *
 * Supaya angka laporan sama dengan file acuan, definisi yang dipakai di sini
 * adalah: item yang statusnya sudah masuk pengerjaan, yaitu `dikonfirmasi`
 * atau `diperbaiki`, apa pun item_type-nya. Item yang masih `baru` tidak
 * dihitung, sama seperti file Excel yang hanya menyebut "On Progress".
 * Resolution rate dihitung (total_bug - belum_selesai) / total_bug.
 */
export async function getKpiKlien(
  opts: OpsiBulanan,
  tanggalAcuan?: string
): Promise<KpiKlien> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;
  const acuan = tanggalAcuan ?? (await getTanggalAcuan(opts));

  const hasil = rows<{
    total_bug: number;
    bug_7_terakhir: number;
    bug_7_sebelumnya: number;
    belum_selesai: number;
  }>(
    await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE item_type = 'bug')::int AS total_bug,
        count(*) FILTER (WHERE item_type = 'bug'
           AND (found_at AT TIME ZONE 'Asia/Jakarta')::date
               BETWEEN ${acuan}::date - 6 AND ${acuan}::date)::int AS bug_7_terakhir,
        count(*) FILTER (WHERE item_type = 'bug'
           AND (found_at AT TIME ZONE 'Asia/Jakarta')::date
               BETWEEN ${acuan}::date - 13 AND ${acuan}::date - 7)::int AS bug_7_sebelumnya,
        count(*) FILTER (WHERE status IN ('dikonfirmasi','diperbaiki'))::int AS belum_selesai
      FROM bugs
      WHERE exclude_from_analysis = false
        AND (${p}::int IS NULL OR project_id = ${p})
        AND (found_at AT TIME ZONE 'Asia/Jakarta')::date >= ${awal}::date
        AND (found_at AT TIME ZONE 'Asia/Jakarta')::date <  (${awal}::date + interval '1 month')
    `)
  );

  const r = hasil[0];
  const totalBug = num(r?.total_bug);
  const terakhir = num(r?.bug_7_terakhir);
  const sebelumnya = num(r?.bug_7_sebelumnya);
  const belumSelesai = num(r?.belum_selesai);
  const selesai = Math.max(0, totalBug - belumSelesai);

  return {
    totalBug,
    bug7Terakhir: terakhir,
    bug7Sebelumnya: sebelumnya,
    perubahan: sebelumnya > 0 ? (terakhir - sebelumnya) / sebelumnya : null,
    belumSelesai,
    selesai,
    resolutionRate: totalBug > 0 ? selesai / totalBug : null,
    tanggalAcuan: acuan,
    rentangTerakhir: namaRentang(geserHari(acuan, -6), acuan),
    rentangSebelumnya: namaRentang(geserHari(acuan, -13), geserHari(acuan, -7)),
  };
}

// ============ KATEGORI BUG UNTUK LAPORAN KLIEN ============

export async function getKategoriBugKlien(
  opts: OpsiBulanan
): Promise<BarisKategori[]> {
  return getJumlahPerKategori({ ...opts, sertakanTambahan: false });
}

// ============ 10.6 SCOPE TAMBAHAN ============

export interface BarisScope {
  id: number;
  discussedOn: string;
  requester: string;
  area: string;
  request: string;
  expectedOutcome: string | null;
  types: string[];
  label: string | null;
  phasePosition: string;
  status: string;
  notes: string | null;
  bugId: number | null;
}

export async function getScope(
  opts: OpsiBulanan
): Promise<BarisScope[]> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;

  const hasil = rows<{
    id: number;
    discussed_on: string;
    requester: string;
    area: string;
    request: string;
    expected_outcome: string | null;
    types: string[] | null;
    label: string | null;
    phase_position: string;
    status: string;
    notes: string | null;
    bug_id: number | null;
  }>(
    await db.execute(sql`
      SELECT id,
             to_char(discussed_on, 'YYYY-MM-DD') AS discussed_on,
             requester, area, request, expected_outcome,
             types::text[] AS types,
             label, phase_position, status, notes, bug_id
      FROM scope_requests
      WHERE (${p}::int IS NULL OR project_id = ${p})
        AND discussed_on >= ${awal}::date
        AND discussed_on <  (${awal}::date + interval '1 month')
      ORDER BY discussed_on, id
    `)
  );

  return hasil.map((r) => ({
    id: r.id,
    discussedOn: String(r.discussed_on).slice(0, 10),
    requester: r.requester,
    area: r.area,
    request: r.request,
    expectedOutcome: r.expected_outcome,
    types: r.types ?? [],
    label: r.label,
    phasePosition: r.phase_position,
    status: r.status,
    notes: r.notes,
    bugId: r.bug_id,
  }));
}

export interface KpiScope {
  total: number;
  luarPhase: number;
  requester: number;
  disetujui: number;
}

export async function getKpiScope(opts: OpsiBulanan): Promise<KpiScope> {
  const awal = opts.awalEfektif ?? `${opts.bulan}-01`;
  const p = opts.projectId;

  const hasil = rows<{
    total: number;
    luar: number;
    requester: number;
    disetujui: number;
  }>(
    await db.execute(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE phase_position = 'luar_phase')::int AS luar,
             count(DISTINCT requester)::int AS requester,
             count(*) FILTER (WHERE status IN ('disetujui','dikerjakan','selesai'))::int AS disetujui
      FROM scope_requests
      WHERE (${p}::int IS NULL OR project_id = ${p})
        AND discussed_on >= ${awal}::date
        AND discussed_on <  (${awal}::date + interval '1 month')
    `)
  );
  const r = hasil[0];
  return {
    total: num(r?.total),
    luarPhase: num(r?.luar),
    requester: num(r?.requester),
    disetujui: num(r?.disetujui),
  };
}

// ============ CATATAN YANG BISA DIEDIT (report_notes) ============

export interface Catatan {
  section: string;
  body: string;
}

export async function getCatatan(
  bulan: string,
  projectId: number | null,
  sections: string[]
): Promise<Record<string, string>> {
  if (sections.length === 0) return {};
  const awal = `${bulan}-01`;

  // Dipakai query builder, bukan sql.join, supaya tiap section jadi parameter
  // dan tidak masuk ke dalam teks SQL.
  const syarat = [
    eq(reportNotes.bulan, awal),
    inArray(reportNotes.section, sections),
    projectId === null
      ? isNull(reportNotes.projectId)
      : eq(reportNotes.projectId, projectId),
  ];

  const hasil = await db
    .select({ section: reportNotes.section, body: reportNotes.body })
    .from(reportNotes)
    .where(and(...syarat));

  const peta: Record<string, string> = {};
  for (const r of hasil) peta[r.section] = r.body;
  return peta;
}

/** Daftar bulan yang punya laporan, terbaru lebih dulu, untuk MonthPicker. */
export async function getBulanTersedia(
  projectId: number | null
): Promise<string[]> {
  const hasil = rows<{ bulan: string }>(
    await db.execute(sql`
      SELECT DISTINCT to_char((found_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM') AS bulan
      FROM bugs
      WHERE (${projectId}::int IS NULL OR project_id = ${projectId})
      ORDER BY 1 DESC
      LIMIT 24
    `)
  );
  return hasil.map((r) => String(r.bulan));
}