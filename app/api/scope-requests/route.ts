import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { scopeRequests, type ScopePosition, type ScopeStatus } from "@/db/schema";
import { getKpiScope, getScope } from "@/lib/reports-bulanan";
import { bacaOpsi, type SearchParams } from "@/lib/params-bulanan";

const VALID_POSISI = new Set<string>(["dalam_phase", "luar_phase"]);
const VALID_STATUS = new Set<string>([
  "dibahas",
  "disetujui",
  "dikerjakan",
  "selesai",
  "ditolak",
]);
const VALID_TIPE = new Set<string>(["new_requirement", "enhancement"]);

/** GET /api/scope-requests?bulan=&project_id= */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const opsi = bacaOpsi(sp);

  const [daftar, kpi] = await Promise.all([getScope(opsi), getKpiScope(opsi)]);
  return NextResponse.json({ bulan: opsi.bulan, kpi, data: daftar });
}

/** POST /api/scope-requests - buat request baru. */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireRole(["admin", "tester"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const requester = String(body.requester ?? "").trim();
  const request = String(body.request ?? "").trim();
  const discussedOn = String(body.discussedOn ?? "").trim();

  if (!requester || !request || !/^\d{4}-\d{2}-\d{2}$/.test(discussedOn)) {
    return NextResponse.json(
      { error: "Requester, kebutuhan, dan tanggal dibahas wajib diisi." },
      { status: 400 }
    );
  }

  const tipe = Array.isArray(body.types)
    ? body.types.map(String).filter((t) => VALID_TIPE.has(t))
    : [];
  const posisi = VALID_POSISI.has(String(body.phasePosition))
    ? (String(body.phasePosition) as ScopePosition)
    : "luar_phase";
  const status = VALID_STATUS.has(String(body.status))
    ? (String(body.status) as ScopeStatus)
    : "dibahas";

  // project_id wajib. Kalau klien sedang lihat "Semua project", pakai project
  // pertama supaya request tetap tertanam pada project yang nyata.
  let projectId = body.projectId ? Number(body.projectId) : NaN;
  if (!Number.isFinite(projectId)) {
    const pertama = await db.query.projects.findFirst({
      columns: { id: true },
      orderBy: (p, { asc }) => [asc(p.id)],
    });
    if (!pertama) {
      return NextResponse.json(
        { error: "Belum ada project. Buat project dulu." },
        { status: 400 }
      );
    }
    projectId = pertama.id;
  }

  // Requester boleh banyak, dipisah koma; yang tersimpan hanya nama pertama
  // supaya pivot per requester tetap rapi.
  const [baru] = await db
    .insert(scopeRequests)
    .values({
      projectId,
      discussedOn,
      requester: requester.split(",")[0].trim(),
      area: String(body.area ?? "").trim(),
      request,
      expectedOutcome: body.expectedOutcome
        ? String(body.expectedOutcome)
        : null,
      types: tipe as ("new_requirement" | "enhancement")[],
      label: body.label ? String(body.label) : null,
      phasePosition: posisi,
      status,
      notes: body.notes ? String(body.notes) : null,
      createdBy: user.id,
    })
    .returning();

  return NextResponse.json({ data: baru }, { status: 201 });
}