import type { OpsiBulanan } from "@/lib/reports-bulanan";
import { siapkanOpsi } from "@/lib/reports-bulanan";

/**
 * Parameter URL laporan bulanan.
 *
 * Semua laporan memakai satu bulan (`bulan=2026-08`) dan satu project
 * (`project_id=`; kosong berarti semua project digabung). Saklar "Hitung"
 * memakai `hitung=bug+tambahan` untuk padanan sheet "+ Tambahan".
 */

export type SearchParams = Record<string, string | string[] | undefined>;

function satu(nilai: string | string[] | undefined): string | undefined {
  if (Array.isArray(nilai)) return nilai[0];
  return nilai;
}

/** Bulan terpilih; default bulan berjalan. */
export function bacaBulan(sp: SearchParams): string {
  const mentah = satu(sp.bulan);
  if (mentah && /^\d{4}-\d{2}$/.test(mentah)) return mentah;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Project terpilih; undefined berarti semua project. */
export function bacaProjectId(sp: SearchParams): number | null {
  const mentah = satu(sp.project_id);
  if (!mentah) return null;
  const n = parseInt(mentah, 10);
  return Number.isFinite(n) ? n : null;
}

/** true = hitung bug + temuan tambahan (sheet "+ Tambahan"). */
export function bacaSertakanTambahan(sp: SearchParams): boolean {
  return satu(sp.hitung) === "bug+tambahan";
}

export function bacaOpsi(sp: SearchParams): OpsiBulanan {
  return {
    bulan: bacaBulan(sp),
    projectId: bacaProjectId(sp),
    sertakanTambahan: bacaSertakanTambahan(sp),
  };
}

/**
 * Versi async yang sekaligus menghitung jendela tanggal laporan.
 * Semua halaman dan endpoint laporan bulanan sebaiknya pakai ini.
 */
export async function bacaOpsiLengkap(sp: SearchParams): Promise<OpsiBulanan> {
  const dasar = bacaOpsi(sp);
  return siapkanOpsi(dasar.bulan, dasar.projectId, dasar.sertakanTambahan);
}

/** Baut query string dari state sekarang, tanpa kehilangan param lain. */
export function buatQuery(
  state: Partial<{ bulan: string; projectId: number | null; hitung: string }>
): string {
  const p = new URLSearchParams();
  if (state.bulan) p.set("bulan", state.bulan);
  if (state.projectId) p.set("project_id", String(state.projectId));
  if (state.hitung) p.set("hitung", state.hitung);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}