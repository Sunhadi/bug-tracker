import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getCatatan,
  getDetailItem,
  getHarianKlien,
  getKategori,
  getKategoriBugKlien,
  getKpiKlien,
  getSubjudulAnalisis,
} from "@/lib/reports-bulanan";
import { bacaOpsiLengkap, type SearchParams } from "@/lib/params-bulanan";

/** Section catatan yang dipakai tab Bug Klien. */
const SECTIONS = ["klien.catatan", "klien.kesimpulan"];

/**
 * GET /api/reports/monthly/klien
 *   ?bulan=YYYY-MM&project_id=&per_tanggal=YYYY-MM-DD
 *
 * Sumber data tab "Bug Klien". `per_tanggal` meng_override tanggal acuan KPI.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const opsi = await bacaOpsiLengkap(sp);
  const perTanggal =
    typeof sp.per_tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.per_tanggal)
      ? sp.per_tanggal
      : undefined;

  const [harian, kpi, kategori, catatan, subjudul, detail] = await Promise.all([
    getHarianKlien(opsi),
    getKpiKlien(opsi, perTanggal),
    getKategoriBugKlien(opsi),
    getCatatan(opsi.bulan, opsi.projectId, SECTIONS),
    getSubjudulAnalisis(opsi),
    getDetailItem(opsi),
  ]);

  const warna: Record<string, string> = {};
  for (const k of await getKategori()) warna[k.name] = k.color;

  return NextResponse.json({
    bulan: opsi.bulan,
    project_id: opsi.projectId,
    harian,
    kpi,
    kategori,
    catatan,
    subjudul,
    warna,
    record: detail,
  });
}