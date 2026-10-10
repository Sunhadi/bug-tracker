import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testRuns } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const testCaseId = parseInt(id, 10);

    const data = await db.query.testRuns.findMany({
      where: eq(testRuns.testCaseId, testCaseId),
      orderBy: [desc(testRuns.runAt)],
      with: { runBy: { columns: { name: true } } },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const testCaseId = parseInt(id, 10);
    const { result, note, bug_id } = await req.json();

    if (!["pass", "fail", "blocked"].includes(result)) {
      return NextResponse.json(
        { error: "Result harus pass, fail, atau blocked" },
        { status: 400 }
      );
    }

    const [run] = await db
      .insert(testRuns)
      .values({
        testCaseId,
        result,
        note: note ?? null,
        bugId: bug_id ? parseInt(bug_id, 10) : null,
        runBy: user.id,
      })
      .returning();

    return NextResponse.json({ data: run }, { status: 201 });
  } catch (error) {
    console.error("Create test run error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
