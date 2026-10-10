import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  bugs,
  bugStatusHistory,
  bugComments,
  attachments,
  type BugSeverity,
  type BugItemType,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

const VALID_SEVERITIES = new Set<string>(["kritis", "tinggi", "sedang", "rendah"]);
const VALID_ITEM_TYPES = new Set<string>([
  "bug",
  "operational",
  "penambahan",
  "penyesuaian",
  "new_item",
]);

// GET /api/bugs/:id - Detail bug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bugId = parseInt(id, 10);

  const bug = await db.query.bugs.findFirst({
    where: eq(bugs.id, bugId),
    with: {
      project: { columns: { name: true } },
      module: { columns: { name: true } },
      reporter: { columns: { name: true, email: true } },
      assignee: { columns: { name: true, email: true } },
    },
  });

  if (!bug) {
    return NextResponse.json({ error: "Bug tidak ditemukan" }, { status: 404 });
  }

  // Ambil history, komentar, dan lampiran
  const [history, comments, lampiran] = await Promise.all([
    db.query.bugStatusHistory.findMany({
      where: eq(bugStatusHistory.bugId, bugId),
      orderBy: (h, { desc }) => [desc(h.changedAt)],
      with: { changedBy: { columns: { name: true } } },
    }),
    db.query.bugComments.findMany({
      where: eq(bugComments.bugId, bugId),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
      with: { user: { columns: { name: true } } },
    }),
    db.query.attachments.findMany({
      where: eq(attachments.bugId, bugId),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
      with: { uploadedBy: { columns: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    data: { ...bug, history, comments, attachments: lampiran },
  });
}

// PATCH /api/bugs/:id - Ubah data bug
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const bugId = parseInt(id, 10);
    const body = (await req.json()) as Record<string, unknown>;

    const existing = await db.query.bugs.findFirst({
      where: eq(bugs.id, bugId),
    });
    if (!existing) {
      return NextResponse.json({ error: "Bug tidak ditemukan" }, { status: 404 });
    }

    const updateData: Partial<typeof bugs.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Mapping eksplisit supaya tidak ada dynamic key yang lolos tipe check.
    if (body.module_id !== undefined) {
      updateData.moduleId =
        body.module_id === null ? null : Number(body.module_id);
    }
    if (body.assignee_id !== undefined) {
      updateData.assigneeId =
        body.assignee_id === null ? null : Number(body.assignee_id);
    }
    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.description !== undefined)
      updateData.description = body.description as string | null;
    if (body.steps !== undefined) updateData.steps = body.steps as string | null;
    if (body.expected_result !== undefined)
      updateData.expectedResult = body.expected_result as string | null;
    if (body.actual_result !== undefined)
      updateData.actualResult = body.actual_result as string | null;
    if (body.environment !== undefined)
      updateData.environment = body.environment as string | null;
    if (body.severity !== undefined && VALID_SEVERITIES.has(String(body.severity))) {
      updateData.severity = body.severity as BugSeverity;
    }
    if (body.priority !== undefined) {
      updateData.priority = Number(body.priority);
    }

    // Field laporan bulanan (bagian 12 dokumen redesign).
    if (body.category_id !== undefined) {
      updateData.categoryId =
        body.category_id === null ? null : Number(body.category_id);
    }
    if (body.action_note !== undefined) {
      updateData.actionNote = body.action_note === null ? null : String(body.action_note);
    }
    if (body.fix_version !== undefined) {
      updateData.fixVersion =
        body.fix_version === null ? null : String(body.fix_version);
    }
    if (body.pic_name !== undefined) {
      updateData.picName = body.pic_name === null ? null : String(body.pic_name);
    }
    if (body.item_type !== undefined) {
      const t = String(body.item_type);
      if (VALID_ITEM_TYPES.has(t)) updateData.itemType = t as BugItemType;
    }
    if (body.labels !== undefined && Array.isArray(body.labels)) {
      updateData.labels = body.labels.map((l) => String(l));
    }
    if (body.exclude_from_analysis !== undefined) {
      updateData.excludeFromAnalysis = Boolean(body.exclude_from_analysis);
    }
    if (body.exclude_reason !== undefined) {
      updateData.excludeReason =
        body.exclude_reason === null ? null : String(body.exclude_reason);
    }

    const [updated] = await db
      .update(bugs)
      .set(updateData)
      .where(eq(bugs.id, bugId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update bug error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
