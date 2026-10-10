import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type {
  BacklogRow,
  DibukaUlangRow,
  ModulRow,
  RataPerbaikanRow,
  SeverityRow,
  TrendBulanRow,
  TrendResult,
} from "@/lib/trend";

/**
 * Agregasi laporan trend bulanan.
 * Semua perhitungan di SQL, bukan di JavaScript, supaya hemat kuota CPU
 * function di Vercel dan tidak menarik banyak baris ke aplikasi.
 */

export interface TrendFilters {
  projectId?: number | null;
  moduleId?: number | null;
}

function toRows<T>(result: unknown): T[] {
  return Array.from(result as Iterable<T>);
}

/** count() dari Postgres datang sebagai string; pastikan jadi number. */
function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getTrendReport(
  filters: TrendFilters = {}
): Promise<TrendResult> {
  const p = filters.projectId ?? null;
  const m = filters.moduleId ?? null;

  // 7.1 Ditemukan vs selesai per bulan (12 bulan terakhir)
  const ditemukanVsSelesai = toRows<TrendBulanRow>(
    await db.execute(sql`
      SELECT
        to_char(m.bulan, 'YYYY-MM') AS bulan,
        COALESCE(f.ditemukan, 0)::int AS ditemukan,
        COALESCE(r.selesai, 0)::int   AS selesai
      FROM generate_series(
               date_trunc('month', now()) - interval '11 months',
               date_trunc('month', now()),
               interval '1 month') AS m(bulan)
      LEFT JOIN (
        SELECT date_trunc('month', created_at) AS bulan, count(*) AS ditemukan
        FROM bugs
        WHERE (${p}::int IS NULL OR project_id = ${p})
          AND (${m}::int IS NULL OR module_id  = ${m})
        GROUP BY 1
      ) f ON f.bulan = m.bulan
      LEFT JOIN (
        SELECT date_trunc('month', closed_at) AS bulan, count(*) AS selesai
        FROM bugs
        WHERE closed_at IS NOT NULL
          AND (${p}::int IS NULL OR project_id = ${p})
          AND (${m}::int IS NULL OR module_id  = ${m})
        GROUP BY 1
      ) r ON r.bulan = m.bulan
      ORDER BY m.bulan;
    `)
  ).map((r) => ({
    bulan: String(r.bulan),
    ditemukan: num(r.ditemukan),
    selesai: num(r.selesai),
  }));

  // 7.2 Backlog di akhir tiap bulan
  const backlog = toRows<BacklogRow>(
    await db.execute(sql`
      SELECT
        to_char(m.bulan, 'YYYY-MM') AS bulan,
        count(b.id)::int             AS backlog
      FROM generate_series(
               date_trunc('month', now()) - interval '11 months',
               date_trunc('month', now()),
               interval '1 month') AS m(bulan)
      LEFT JOIN bugs b
        ON b.created_at < (m.bulan + interval '1 month')
       AND (b.closed_at IS NULL OR b.closed_at >= (m.bulan + interval '1 month'))
       AND b.status <> 'ditolak'
       AND (${p}::int IS NULL OR b.project_id = ${p})
       AND (${m}::int IS NULL OR b.module_id  = ${m})
      GROUP BY m.bulan
      ORDER BY m.bulan;
    `)
  ).map((r) => ({ bulan: String(r.bulan), backlog: num(r.backlog) }));

  // 7.3 Per severity per bulan
  const perSeverity = toRows<SeverityRow>(
    await db.execute(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS bulan,
        severity::text,
        count(*)::int AS jumlah
      FROM bugs
      WHERE created_at >= date_trunc('month', now()) - interval '11 months'
        AND (${p}::int IS NULL OR project_id = ${p})
        AND (${m}::int IS NULL OR module_id  = ${m})
      GROUP BY 1, 2
      ORDER BY 1, 2;
    `)
  ).map((r) => ({
    bulan: String(r.bulan),
    severity: String(r.severity),
    jumlah: num(r.jumlah),
  }));

  // 7.4 Per modul per bulan
  const perModul = toRows<ModulRow>(
    await db.execute(sql`
      SELECT
        to_char(date_trunc('month', b.created_at), 'YYYY-MM') AS bulan,
        COALESCE(mo.name, '(tanpa modul)')                    AS modul,
        count(*)::int                                         AS jumlah
      FROM bugs b
      LEFT JOIN modules mo ON mo.id = b.module_id
      WHERE b.created_at >= date_trunc('month', now()) - interval '11 months'
        AND (${p}::int IS NULL OR b.project_id = ${p})
      GROUP BY 1, 2
      ORDER BY 1, jumlah DESC;
    `)
  ).map((r) => ({
    bulan: String(r.bulan),
    modul: String(r.modul),
    jumlah: num(r.jumlah),
  }));

  // 7.5 Rata-rata waktu perbaikan (hari)
  const rataPerbaikan = toRows<RataPerbaikanRow>(
    await db.execute(sql`
      SELECT
        to_char(date_trunc('month', closed_at), 'YYYY-MM') AS bulan,
        round(avg(extract(epoch FROM (closed_at - created_at)) / 86400)::numeric, 1) AS rata_hari
      FROM bugs
      WHERE closed_at IS NOT NULL
        AND closed_at >= date_trunc('month', now()) - interval '11 months'
        AND (${p}::int IS NULL OR project_id = ${p})
        AND (${m}::int IS NULL OR module_id  = ${m})
      GROUP BY 1
      ORDER BY 1;
    `)
  ).map((r) => ({
    bulan: String(r.bulan),
    rata_hari: r.rata_hari === null ? 0 : Number(r.rata_hari),
  }));

  // 7.6 Bug dibuka ulang per bulan
  const dibukaUlang = toRows<DibukaUlangRow>(
    await db.execute(sql`
      SELECT
        to_char(date_trunc('month', changed_at), 'YYYY-MM') AS bulan,
        count(DISTINCT bug_id)::int AS dibuka_ulang
      FROM bug_status_history
      WHERE to_status = 'dibuka_ulang'
        AND changed_at >= date_trunc('month', now()) - interval '11 months'
      GROUP BY 1
      ORDER BY 1;
    `)
  ).map((r) => ({ bulan: String(r.bulan), dibuka_ulang: num(r.dibuka_ulang) }));

  return {
    ditemukanVsSelesai,
    backlog,
    perSeverity,
    perModul,
    rataPerbaikan,
    dibukaUlang,
  };
}