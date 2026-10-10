import { NextRequest, NextResponse } from "next/server";
import { getTrendReport } from "@/lib/reports";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const moduleId = searchParams.get("module_id");

  const trend = await getTrendReport({
    projectId: projectId ? parseInt(projectId, 10) : null,
    moduleId: moduleId ? parseInt(moduleId, 10) : null,
  });

  return NextResponse.json(trend);
}