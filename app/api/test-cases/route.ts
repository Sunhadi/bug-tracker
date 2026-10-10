import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { testCases } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("project_id");
  const parsed = projectId ? parseInt(projectId, 10) : NaN;
  const where =
    Number.isFinite(parsed) ? eq(testCases.projectId, parsed) : undefined;

  // Satu run terakhir ikut diambil untuk kolom "Last result".
  const data = await db.query.testCases.findMany({
    where,
    orderBy: [desc(testCases.createdAt)],
    columns: {
      id: true,
      title: true,
      steps: true,
      expected: true,
      createdAt: true,
    },
    with: {
      project: { columns: { name: true } },
      module: { columns: { name: true } },
      runs: {
        orderBy: (r, { desc: d }) => [d(r.runAt)],
        limit: 1,
        columns: { result: true, runAt: true },
      },
    },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const { project_id, module_id, title, steps, expected } = body;

    if (!project_id || !title) {
      return NextResponse.json(
        { error: "project_id dan title wajib diisi" },
        { status: 400 }
      );
    }

    const [tc] = await db
      .insert(testCases)
      .values({
        projectId: parseInt(project_id, 10),
        moduleId: module_id ? parseInt(module_id, 10) : null,
        title,
        steps: steps ?? null,
        expected: expected ?? null,
      })
      .returning();

    return NextResponse.json({ data: tc }, { status: 201 });
  } catch (error) {
    console.error("Create test case error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}