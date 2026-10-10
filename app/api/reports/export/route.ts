import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bugs, type BugStatus, type BugSeverity } from "@/db/schema";
import { eq, and, desc, like, or, sql, type SQL } from "drizzle-orm";
import ExcelJS from "exceljs";

/** db.execute() mengembalikan RowList yang iterable, bukan objek ber-property .rows */
function toRows<T = Record<string, unknown>>(result: unknown): T[] {
  return Array.from(result as Iterable<T>);
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "bugs";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bug Tracker";
  workbook.created = new Date();

  if (type === "bugs") {
    // Filter sama seperti daftar bug
    const projectId = searchParams.get("project_id");
    const moduleId = searchParams.get("module_id");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const search = searchParams.get("search");

    const conditions: SQL[] = [];
    if (projectId) conditions.push(eq(bugs.projectId, parseInt(projectId, 10)));
    if (moduleId) conditions.push(eq(bugs.moduleId, parseInt(moduleId, 10)));
    if (status) conditions.push(eq(bugs.status, status as BugStatus));
    if (severity)
      conditions.push(eq(bugs.severity, severity as BugSeverity));
    if (search) {
      const searchFilter = or(
        like(bugs.title, `%${search}%`),
        like(bugs.code, `%${search}%`)
      );
      if (searchFilter) conditions.push(searchFilter);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.bugs.findMany({
      where: whereClause,
      orderBy: [desc(bugs.createdAt)],
      with: {
        project: { columns: { name: true } },
        module: { columns: { name: true } },
        reporter: { columns: { name: true } },
        assignee: { columns: { name: true } },
      },
    });

    const sheet = workbook.addWorksheet("Bugs");
    sheet.columns = [
      { header: "Kode", key: "code", width: 12 },
      { header: "Judul", key: "title", width: 40 },
      { header: "Project", key: "project", width: 20 },
      { header: "Modul", key: "module", width: 15 },
      { header: "Severity", key: "severity", width: 10 },
      { header: "Prioritas", key: "priority", width: 10 },
      { header: "Status", key: "status", width: 14 },
      { header: "Pelapor", key: "reporter", width: 15 },
      { header: "Penanggung Jawab", key: "assignee", width: 15 },
      { header: "Environment", key: "environment", width: 15 },
      { header: "Dibuat", key: "createdAt", width: 12 },
      { header: "Ditutup", key: "closedAt", width: 12 },
      { header: "Deskripsi", key: "description", width: 50 },
      { header: "Langkah Reproduksi", key: "steps", width: 50 },
      { header: "Hasil Diharapkan", key: "expectedResult", width: 30 },
      { header: "Hasil Aktual", key: "actualResult", width: 30 },
    ];

    data.forEach((b) => {
      sheet.addRow({
        code: b.code,
        title: b.title,
        project: b.project?.name ?? "-",
        module: b.module?.name ?? "-",
        severity: b.severity,
        priority: b.priority === 1 ? "Tinggi" : b.priority === 2 ? "Sedang" : "Rendah",
        status: b.status.replace("_", " "),
        reporter: b.reporter?.name ?? "-",
        assignee: b.assignee?.name ?? "-",
        environment: b.environment ?? "-",
        createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : "-",
        closedAt: b.closedAt ? new Date(b.closedAt).toLocaleDateString("id-ID") : "-",
        description: b.description ?? "",
        steps: b.steps ?? "",
        expectedResult: b.expectedResult ?? "",
        actualResult: b.actualResult ?? "",
      });
    });

    // Header style
    sheet.getRow(1).font = { bold: true };
  } else if (type === "trend") {
    // Export data trend bulanan
    const projectId = searchParams.get("project_id");
    const p = projectId ? parseInt(projectId, 10) : null;

    const sheet = workbook.addWorksheet("Trend Bulanan");
    sheet.columns = [
      { header: "Bulan", key: "bulan", width: 12 },
      { header: "Ditemukan", key: "ditemukan", width: 12 },
      { header: "Selesai", key: "selesai", width: 12 },
      { header: "Backlog", key: "backlog", width: 12 },
      { header: "Dibuka Ulang", key: "dibuka_ulang", width: 14 },
      { header: "Rata-rata Perbaikan (hari)", key: "rata_hari", width: 22 },
    ];

    // Aggregate dari SQL
    const result = await db.execute(sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', now()) - interval '11 months',
          date_trunc('month', now()),
          interval '1 month'
        ) AS bulan
      ),
      ditemukan AS (
        SELECT date_trunc('month', created_at) AS bulan, count(*) AS jumlah
        FROM bugs
        WHERE (${p}::int IS NULL OR project_id = ${p})
        GROUP BY 1
      ),
      selesai AS (
        SELECT date_trunc('month', closed_at) AS bulan, count(*) AS jumlah
        FROM bugs
        WHERE closed_at IS NOT NULL AND (${p}::int IS NULL OR project_id = ${p})
        GROUP BY 1
      ),
      backlog AS (
        SELECT m.bulan, count(b.id) AS jumlah
        FROM months m
        LEFT JOIN bugs b
          ON b.created_at < (m.bulan + interval '1 month')
         AND (b.closed_at IS NULL OR b.closed_at >= (m.bulan + interval '1 month'))
         AND b.status <> 'ditolak'
         AND (${p}::int IS NULL OR b.project_id = ${p})
        GROUP BY m.bulan
      ),
      reopened AS (
        SELECT date_trunc('month', changed_at) AS bulan, count(DISTINCT bug_id) AS jumlah
        FROM bug_status_history
        WHERE to_status = 'dibuka_ulang'
          AND changed_at >= date_trunc('month', now()) - interval '11 months'
        GROUP BY 1
      ),
      avg_fix AS (
        SELECT date_trunc('month', closed_at) AS bulan,
               round(avg(extract(epoch FROM (closed_at - created_at)) / 86400)::numeric, 1) AS hari
        FROM bugs
        WHERE closed_at IS NOT NULL
          AND closed_at >= date_trunc('month', now()) - interval '11 months'
          AND (${p}::int IS NULL OR project_id = ${p})
        GROUP BY 1
      )
      SELECT
        to_char(m.bulan, 'YYYY-MM') AS bulan,
        COALESCE(d.jumlah, 0) AS ditemukan,
        COALESCE(s.jumlah, 0) AS selesai,
        COALESCE(b.jumlah, 0) AS backlog,
        COALESCE(r.jumlah, 0) AS dibuka_ulang,
        COALESCE(a.hari, 0) AS rata_hari
      FROM months m
      LEFT JOIN ditemukan d ON d.bulan = m.bulan
      LEFT JOIN selesai s ON s.bulan = m.bulan
      LEFT JOIN backlog b ON b.bulan = m.bulan
      LEFT JOIN reopened r ON r.bulan = m.bulan
      LEFT JOIN avg_fix a ON a.bulan = m.bulan
      ORDER BY m.bulan;
    `);

    toRows(result).forEach((r) => {
      sheet.addRow(r);
    });

    sheet.getRow(1).font = { bold: true };
  } else if (type === "bulanan") {
    const { buatWorkbookBulanan } = await import("@/lib/export-bulanan");
    await buatWorkbookBulanan(workbook, {
      bulan: searchParams.get("bulan") ?? "",
      projectId: searchParams.get("project_id")
        ? parseInt(searchParams.get("project_id") as string, 10)
        : null,
      sertakanTambahan:
        searchParams.get("hitung") === "bug+tambahan" ||
        searchParams.get("tambahan") === "1",
      grafik: searchParams.get("grafik"),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bug-tracker-${type}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
