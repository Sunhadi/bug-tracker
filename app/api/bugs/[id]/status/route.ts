import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bugs, bugStatusHistory, type BugStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

// POST /api/bugs/:id/status - Ubah status bug
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const bugId = parseInt(id, 10);
    const { status, note } = await req.json();

    const validStatuses = [
      "baru",
      "dikonfirmasi",
      "diperbaiki",
      "retest",
      "selesai",
      "ditolak",
      "dibuka_ulang",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    }

    const bug = await db.query.bugs.findFirst({
      where: eq(bugs.id, bugId),
    });
    if (!bug) {
      return NextResponse.json({ error: "Bug tidak ditemukan" }, { status: 404 });
    }

    const oldStatus = bug.status;
    const now = new Date();

    // closed_at diisi saat Selesai, dikosongkan saat dibuka ulang.
    // Riwayat lama tetap ada di bug_status_history.
    const closedAt =
      status === "selesai" ? now : status === "dibuka_ulang" ? null : bug.closedAt;

    const updateData: Partial<typeof bugs.$inferInsert> = {
      status: status as BugStatus,
      updatedAt: now,
      closedAt,
    };

    const [updated] = await db
      .update(bugs)
      .set(updateData)
      .where(eq(bugs.id, bugId))
      .returning();

    // Tulis history
    await db.insert(bugStatusHistory).values({
      bugId,
      fromStatus: oldStatus,
      toStatus: status,
      changedBy: user.id,
      note: note ?? null,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Status change error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
