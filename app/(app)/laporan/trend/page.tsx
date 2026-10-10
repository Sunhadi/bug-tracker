import Link from "next/link";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { COOKIE_PROJECT } from "@/lib/constants";
import { getTrendReport } from "@/lib/reports";
import { Breadcrumb, LinkButton, PageHeader } from "@/components/ui";
import TrendCharts from "./TrendCharts";

export default async function TrendReportPage() {
  const store = await cookies();
  const projectId = store.get(COOKIE_PROJECT)?.value ?? "";
  const parsed = projectId ? parseInt(projectId, 10) : NaN;

  const [trend, daftarProject] = await Promise.all([
    getTrendReport({
      projectId: Number.isFinite(parsed) ? parsed : null,
    }),
    db.query.projects.findMany({ orderBy: [desc(projects.createdAt)] }),
  ]);

  const exportUrl =
    Number.isFinite(parsed)
      ? `/api/reports/export?type=trend&project_id=${parsed}`
      : "/api/reports/export?type=trend";

  return (
    <div className="space-y-3">
      <PageHeader
        title="Laporan trend"
        description="12 bulan terakhir. Semua angka dihitung di SQL."
        actions={<LinkButton href={exportUrl}>Export Excel</LinkButton>}
      >
        <Breadcrumb
          crumbs={[
            { label: "Bug Tracker", href: "/dashboard" },
            { label: "Trend" },
          ]}
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold tracking-wide text-ink-2 uppercase">
          Project
        </span>
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/laporan/trend"
              className={`inline-block rounded-control border px-2 py-1 text-sm font-semibold ${
                !Number.isFinite(parsed)
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-2 hover:bg-bg"
              }`}
            >
              All
            </Link>
          </li>
          {daftarProject.map((p) => (
            <li key={p.id}>
              <Link
                href={`/laporan/trend?project_id=${p.id}`}
                className={`inline-block rounded-control border px-2 py-1 text-sm font-semibold ${
                  parsed === p.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink-2 hover:bg-bg"
                }`}
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <TrendCharts data={trend} />
    </div>
  );
}