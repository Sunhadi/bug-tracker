import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { scopeRequests, type ScopePosition, type ScopeStatus } from "@/db/schema";

const VALID_POSISI = new Set<string>(["dalam_phase", "luar_phase"]);
const VALID_STATUS = new Set<string>([
  "dibahas",
  "disetujui",
  "dikerjakan",
  "selesai",
  "ditolak",
]);
const VALID_TIPE = new Set<string>(["new_requirement", "enhancement"]);

async function ambilId(params: Promise<{ id: string }>): Promise<number> {
  const { id } = await params;
  return parseInt(id, 10);
}

/** PATCH /api/scope-requests/:id - ubah status atau isi request. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin", "tester"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await ambilId(params);
  const body = (await req.json()) as Record<string, unknown>;

  const ubah: Partial<typeof scopeRequests.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.discussedOn !== undefined) {
    const v = String(body.discussedOn);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }
    ubah.discussedOn = v;
  }
  if (body.requester !== undefined) ubah.requester = String(body.requester);
  if (body.area !== undefined) ubah.area = String(body.area);
  if (body.request !== undefined) ubah.request = String(body.request);
  if (body.expectedOutcome !== undefined) {
    ubah.expectedOutcome = body.expectedOutcome
      ? String(body.expectedOutcome)
      : null;
  }
  if (body.label !== undefined) ubah.label = body.label ? String(body.label) : null;
  if (body.notes !== undefined) ubah.notes = body.notes ? String(body.notes) : null;
  if (Array.isArray(body.types)) {
    ubah.types = body.types
      .map(String)
      .filter((t) => VALID_TIPE.has(t)) as ("new_requirement" | "enhancement")[];
  }
  if (body.phasePosition !== undefined && VALID_POSISI.has(String(body.phasePosition))) {
    ubah.phasePosition = String(body.phasePosition) as ScopePosition;
  }
  if (body.status !== undefined && VALID_STATUS.has(String(body.status))) {
    ubah.status = String(body.status) as ScopeStatus;
  }

  const [diperbarui] = await db
    .update(scopeRequests)
    .set(ubah)
    .where(eq(scopeRequests.id, id))
    .returning();

  if (!diperbarui) {
    return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: diperbarui });
}

/** DELETE /api/scope-requests/:id */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await ambilId(params);
  const dihapus = await db
    .delete(scopeRequests)
    .where(eq(scopeRequests.id, id))
    .returning({ id: scopeRequests.id });

  if (dihapus.length === 0) {
    return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}