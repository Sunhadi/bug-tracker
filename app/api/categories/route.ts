import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * GET/POST/PATCH /api/categories
 * Kelola daftar kategori bug: nama, warna, urutan, dan status aktif.
 * Nama kategori dipakai sebagai kunci pada report_notes, jadi tidak boleh
 * diubah lewat PATCH (dipakai db.query untuk rename yang aman).
 */

const POLA_WARNA = /^#[0-9A-Fa-f]{6}$/;

/** GET /api/categories */
export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasil = await db.execute(sql`
    SELECT c.id, c.name, c.color, c.sort_order, c.is_active,
           COALESCE(x.jumlah, 0)::int AS jumlah
    FROM bug_categories c
    LEFT JOIN (
      SELECT category_id, count(*) AS jumlah FROM bugs GROUP BY category_id
    ) x ON x.category_id = c.id
    ORDER BY c.sort_order, c.name
  `);

  return NextResponse.json({ data: Array.from(hasil as Iterable<unknown>) });
}

/** POST /api/categories - tambah kategori baru. */
export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin", "tester"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const color = String(body.color ?? "#626F86").trim();

  if (!name) {
    return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
  }
  if (!POLA_WARNA.test(color)) {
    return NextResponse.json(
      { error: "Warna harus format #RRGGBB." },
      { status: 400 }
    );
  }

  const sortOrder = Number.isFinite(Number(body.sortOrder))
    ? Number(body.sortOrder)
    : 0;

  const hasil = await db.execute(sql`
    INSERT INTO bug_categories (name, color, sort_order, is_active)
    VALUES (${name}, ${color}, ${sortOrder}, true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name, color, sort_order, is_active
  `);

  const baris = Array.from(hasil as Iterable<Record<string, unknown>>);
  if (baris.length === 0) {
    return NextResponse.json(
      { error: `Kategori "${name}" sudah ada.` },
      { status: 409 }
    );
  }
  return NextResponse.json({ data: baris[0] }, { status: 201 });
}

/** PATCH /api/categories - ubah warna, urutan, atau status aktif. */
export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["admin", "tester"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  const warna = body.color === undefined ? null : String(body.color).trim();
  if (warna !== null && !POLA_WARNA.test(warna)) {
    return NextResponse.json(
      { error: "Warna harus format #RRGGBB." },
      { status: 400 }
    );
  }

  const hasil = await db.execute(sql`
    UPDATE bug_categories SET
      color      = COALESCE(${warna}, color),
      sort_order = COALESCE(${body.sortOrder === undefined ? null : Number(body.sortOrder)}, sort_order),
      is_active  = COALESCE(${body.isActive === undefined ? null : Boolean(body.isActive)}, is_active)
    WHERE id = ${id}
    RETURNING id, name, color, sort_order, is_active
  `);

  const baris = Array.from(hasil as Iterable<Record<string, unknown>>);
  if (baris.length === 0) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: baris[0] });
}