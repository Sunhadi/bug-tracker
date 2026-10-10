import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugComments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// GET /api/bugs/:id/comments - Daftar komentar
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const bugId = parseInt(id, 10);

    const comments = await db.query.bugComments.findMany({
      where: eq(bugComments.bugId, bugId),
      orderBy: [desc(bugComments.createdAt)],
      with: { user: { columns: { name: true } } },
    });

    return NextResponse.json({ data: comments });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST /api/bugs/:id/comments - Tambah komentar
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const bugId = parseInt(id, 10);
    const { body } = await req.json();

    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return NextResponse.json(
        { error: "Isi komentar wajib diisi" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(bugComments)
      .values({
        bugId,
        userId: user.id,
        body: body.trim(),
      })
      .returning();

    const [comment] = await db.query.bugComments.findMany({
      where: eq(bugComments.id, created.id),
      with: { user: { columns: { name: true } } },
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("Add comment error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
