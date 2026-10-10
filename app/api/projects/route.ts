import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db.query.projects.findMany({
    orderBy: [desc(projects.createdAt)],
  });

  return NextResponse.json({ data });
}
