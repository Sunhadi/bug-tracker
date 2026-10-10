import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bugs, scopeRequests } from "@/db/schema";
import { priorityDariSeverity } from "@/lib/jira";

/**
 * POST /api/scope-requests/:id/issue
 * Buat issue dari request scope lalu tautkan balik ke request.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireRole(["admin", "tester"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const scopeId = parseInt(id, 10);

  const request = await db.query.scopeRequests.findFirst({
    where: eq(scopeRequests.id, scopeId),
  });
  if (!request) {
    return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
  }
  if (request.bugId) {
    return NextResponse.json(
      { error: "Request ini sudah tertaut ke issue." },
      { status: 409 }
    );
  }

  const judul = `[Scope] ${request.request}`.slice(0, 400);

  const [baru] = await db.transaction(async (tx) => {
    const [issue] = await tx
      .insert(bugs)
      .values({
        projectId: request.projectId,
        title: judul,
        description: request.expectedOutcome
          ? `Tujuan: ${request.expectedOutcome}`
          : null,
        severity: "sedang",
        priority: priorityDariSeverity("sedang"),
        status: "baru",
        reporterId: user.id,
        actionNote: request.notes,
      })
      .returning();

    await tx
      .update(scopeRequests)
      .set({ bugId: issue.id, updatedAt: new Date() })
      .where(eq(scopeRequests.id, scopeId));

    return [issue];
  });

  return NextResponse.json({ data: baru }, { status: 201 });
}