import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { modules } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  const data = projectId
    ? await db.query.modules.findMany({
        where: eq(modules.projectId, parseInt(projectId, 10)),
      })
    : await db.query.modules.findMany();

  return NextResponse.json({ data });
}
