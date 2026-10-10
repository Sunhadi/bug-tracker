import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugs, bugStatusHistory, type BugStatus, type BugSeverity } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, and, desc, like, or, isNull, gte, sql, count, type SQL } from "drizzle-orm";

const VALID_STATUSES = new Set<string>([
  "baru",
  "dikonfirmasi",
  "diperbaiki",
  "retest",
  "selesai",
  "ditolak",
  "dibuka_ulang",
]);
const VALID_SEVERITIES = new Set<string>(["kritis", "tinggi", "sedang", "rendah"]);

// GET /api/bugs - Daftar bug dengan filter, pencarian, paginasi
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const moduleId = searchParams.get("module_id");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assignee_id");
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");
    const search = searchParams.get("search");
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, rawLimit) : 20;
    const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (projectId && Number.isFinite(parseInt(projectId, 10)))
    conditions.push(eq(bugs.projectId, parseInt(projectId, 10)));
  if (moduleId && Number.isFinite(parseInt(moduleId, 10)))
    conditions.push(eq(bugs.moduleId, parseInt(moduleId, 10)));
  if (status && VALID_STATUSES.has(status as BugStatus))
    conditions.push(eq(bugs.status, status as BugStatus));
  if (severity && VALID_SEVERITIES.has(severity as BugSeverity))
    conditions.push(eq(bugs.severity, severity as BugSeverity));
  // Filter priority
  if (priority && Number.isFinite(parseInt(priority, 10)))
    conditions.push(eq(bugs.priority, parseInt(priority, 10)));
  // Filter assignee; "unassigned" berarti yang belum ditugaskan
  if (assigneeId === "unassigned") {
    conditions.push(isNull(bugs.assigneeId));
  } else if (assigneeId && Number.isFinite(parseInt(assigneeId, 10))) {
    conditions.push(eq(bugs.assigneeId, parseInt(assigneeId, 10)));
  }
  // Rentang tanggal dibuat, batas bawah inklusif dan batas atas eksklusif
  // terhadap hari berikutnya supayaseluruh hari kedua tercakup.
  if (dari && /^\d{4}-\d{2}-\d{2}$/.test(dari))
    conditions.push(
      gte(bugs.createdAt, sql`${dari}::timestamptz`)
    );
  if (sampai && /^\d{4}-\d{2}-\d{2}$/.test(sampai))
    conditions.push(
      sql`${bugs.createdAt} < (${sampai}::date + interval '1 day')::timestamptz`
    );
  if (search) {
    const searchFilter = or(
      like(bugs.title, `%${search}%`),
      like(bugs.code, `%${search}%`),
      like(bugs.description, `%${search}%`)
    );
    if (searchFilter) conditions.push(searchFilter);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.query.bugs.findMany({
      where: whereClause,
      orderBy: [desc(bugs.createdAt)],
      limit,
      offset,
      with: {
        project: { columns: { name: true } },
        module: { columns: { name: true } },
        reporter: { columns: { name: true } },
        assignee: { columns: { name: true } },
      },
    }),
    db.select({ value: count() }).from(bugs).where(whereClause),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: totalResult[0]?.value ?? 0,
      totalPages: Math.ceil((totalResult[0]?.value ?? 0) / limit),
    },
  });
}

// POST /api/bugs - Buat bug baru
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      project_id,
      module_id,
      title,
      description,
      steps,
      expected_result,
      actual_result,
      environment,
      severity,
      priority,
      assignee_id,
    } = body;

    if (!project_id || !title) {
      return NextResponse.json(
        { error: "project_id dan title wajib diisi" },
        { status: 400 }
      );
    }

    // Generate kode bug: BUG-XXXX
    const lastBug = await db.query.bugs.findFirst({
      orderBy: [desc(bugs.id)],
      columns: { id: true },
    });
    const nextId = (lastBug?.id ?? 0) + 1;
    const code = `BUG-${String(nextId).padStart(4, "0")}`;

    const [bug] = await db
      .insert(bugs)
      .values({
        code,
        projectId: parseInt(project_id, 10),
        moduleId: module_id ? parseInt(module_id, 10) : null,
        title,
        description: description ?? null,
        steps: steps ?? null,
        expectedResult: expected_result ?? null,
        actualResult: actual_result ?? null,
        environment: environment ?? null,
        severity: severity ?? "sedang",
        priority: priority ?? 2,
        status: "baru",
        reporterId: user.id,
        assigneeId: assignee_id ? parseInt(assignee_id, 10) : null,
      })
      .returning();

    // Tulis history awal
    await db.insert(bugStatusHistory).values({
      bugId: bug.id,
      fromStatus: null,
      toStatus: "baru",
      changedBy: user.id,
      note: "Bug dibuat",
    });

    return NextResponse.json({ data: bug }, { status: 201 });
  } catch (error) {
    console.error("Create bug error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
