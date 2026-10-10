import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportNotes } from "@/db/schema";
import { getCatatan } from "@/lib/reports-bulanan";
import { bacaBulan, bacaProjectId, type SearchParams } from "@/lib/params-bulanan";

/**
 * GET /api/report-notes?bulan=&project_id=&section=
 * PUT /api/report-notes  body: { bulan, project_id, section, body }
 *
 * Catatan yang bisa diedit langsung di laporan (kolom Catatan di tabel
 * kategori dan kolom Catatan di kartu Kesimpulan).
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const bulan = bacaBulan(sp);
  const projectId = bacaProjectId(sp);
  const sections =
    typeof sp.section === "string" && sp.section
      ? [sp.section]
      : ["klien.catatan", "klien.kesimpulan"];

  const catatan = await getCatatan(bulan, projectId, sections);
  return NextResponse.json({ bulan, project_id: projectId, catatan });
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(["admin", "tester"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const bulan = String(body.bulan ?? "");
  const section = String(body.section ?? "");
  const teks = String(body.body ?? "");

  if (!/^\d{4}-\d{2}$/.test(bulan) || !section) {
    return NextResponse.json(
      { error: "Bulan (YYYY-MM) dan section wajib diisi." },
      { status: 400 }
    );
  }

  const projectId = body.project_id ? Number(body.project_id) : null;
  const syarat = [
    eq(reportNotes.bulan, `${bulan}-01`),
    eq(reportNotes.section, section),
    projectId === null
      ? isNull(reportNotes.projectId)
      : eq(reportNotes.projectId, projectId),
  ];

  // Unique index di tabel ini adalah index biasa, bukan constraint, jadi
  // `ON CONFLICT ON CONSTRAINT` tidak bisa dipakai. Update dulu; kalau tidak
  // ada barisnya, baru insert.
  const diperbarui = await db
    .update(reportNotes)
    .set({ body: teks, updatedAt: new Date() })
    .where(and(...syarat))
    .returning({ id: reportNotes.id });

  if (diperbarui.length === 0) {
    try {
      await db.insert(reportNotes).values({
        bulan: `${bulan}-01`,
        section,
        body: teks,
        projectId,
      });
    } catch (err) {
      // Dua request bersamaan bisa reaching insert bersamaan; kalau barisnya
      // sudah ada, jalankan update.
      const ada = await db
        .select({ id: reportNotes.id })
        .from(reportNotes)
        .where(and(...syarat));
      if (ada.length === 0) throw err;
      await db
        .update(reportNotes)
        .set({ body: teks, updatedAt: new Date() })
        .where(and(...syarat));
    }
  }

  return NextResponse.json({ ok: true, section, body: teks });
}