import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getDetailItem,
  getDikecualikan,
  getJumlahPerKategori,
  getKategori,
  getSubjudulAnalisis,
  getTrendDibuat,
  getTrendSelesai,
} from "@/lib/reports-bulanan";
import { bacaOpsiLengkap, type SearchParams } from "@/lib/params-bulanan";

/**
 * GET /api/reports/monthly/kategori
 *   ?bulan=YYYY-MM&project_id=&tambahan=0|1&dikecualikan=0|1
 *
 * Sumber data tab "Kategori Bug". Halaman memakai modul yang sama langsung
 * dari server component; endpoint ini untuk integrasi luar dan unduhan JSON.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = Object.fromEntries(
    req.nextUrl.searchParams.entries()
  ) as SearchParams;
  const opsi = await bacaOpsiLengkap(sp);
  const mauDikecualikan = sp.dikecualikan === "1";

  const [kategori, subjudul, trend, selesai, detail, dikecualikan] =
    await Promise.all([
      getJumlahPerKategori(opsi),
      getSubjudulAnalisis(opsi),
      getTrendDibuat(opsi),
      getTrendSelesai(opsi),
      getDetailItem(opsi),
      mauDikecualikan ? getDikecualikan(opsi) : Promise.resolve([]),
    ]);

  const warna: Record<string, string> = {};
  for (const k of await getKategori()) warna[k.name] = k.color;

  return NextResponse.json({
    bulan: opsi.bulan,
    project_id: opsi.projectId,
    sertakanTambahan: opsi.sertakanTambahan,
    subjudul,
    warna,
    kategori,
    trend,
    selesai,
    detail,
    dikecualikan,
  });
}