import Link from "next/link";
import { cookies } from "next/headers";
import { and, count, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bugs } from "@/db/schema";
import { COOKIE_PROJECT } from "@/lib/constants";
import { STATUS_AKTIF_JIRA, namaStatus } from "@/lib/jira";
import { formatAngka } from "@/lib/format";
import { LinkButton, PageHeader, Panel, StatStrip } from "@/components/ui";
import {
  BugRow,
  StatusBar,
  urutkanPerluPerhatian,
  type BarisBug,
} from "@/components/BugRow";

export default async function DashboardPage() {
  const store = await cookies();
  const projectId = store.get(COOKIE_PROJECT)?.value ?? "";
  const filterProject =
    projectId && Number.isFinite(parseInt(projectId, 10))
      ? eq(bugs.projectId, parseInt(projectId, 10))
      : undefined;

  const awalBulan = `${todayJakarta().slice(0, 7)}-01`;

  // Issue yang belum selesai dan belum ditolak.
  const kondisiAktif = and(
    ne(bugs.status, "selesai"),
    ne(bugs.status, "ditolak"),
    filterProject
  );

  const [jumlahAktif] = await db
    .select({ n: count() })
    .from(bugs)
    .where(kondisiAktif);

  const [jumlahKritis] = await db
    .select({ n: count() })
    .from(bugs)
    .where(and(kondisiAktif, eq(bugs.severity, "kritis")));

  const [jumlahSelesai] = await db
    .select({ n: count() })
    .from(bugs)
    .where(
      and(
        eq(bugs.status, "selesai"),
        gte(bugs.closedAt, sql`${awalBulan}::timestamptz`),
        filterProject
      )
    );

  const [tertua] = await db
    .select({ createdAt: sql<string | null>`min(${bugs.createdAt})` })
    .from(bugs)
    .where(kondisiAktif);

  const statusCounts = await db
    .select({ status: bugs.status, n: count() })
    .from(bugs)
    .where(kondisiAktif)
    .groupBy(bugs.status);

  const petaStatus = new Map(statusCounts.map((r) => [r.status, r.n]));
  const barStatus = STATUS_AKTIF_JIRA.map((status) => ({
    status,
    label: namaStatus(status),
    jumlah: petaStatus.get(status) ?? 0,
  }));

  // Urutan dilakukan di SQL, bukan "ambil 8 yang tertua lalu sortir di JS".
// Kalau disortir setelah di-limit, issue kritis yang umurnya lebih tua dari 8
// issue lain akan hilang dari daftar.
const kandidat = await db.query.bugs.findMany({
    where: kondisiAktif,
    columns: {
      id: true,
      code: true,
      title: true,
      status: true,
      severity: true,
      priority: true,
      createdAt: true,
    },
    orderBy: [
      sql`CASE ${bugs.severity}
            WHEN 'kritis' THEN 0
            WHEN 'tinggi'  THEN 1
            WHEN 'sedang'  THEN 2
            ELSE 3
          END ASC`,
      sql`${bugs.createdAt} ASC`,
    ],
    limit: 8,
  });

  const perluPerhatian: BarisBug[] = urutkanPerluPerhatian(kandidat).map(
    (b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      status: b.status,
      severity: b.severity,
      priority: b.priority,
      createdAt: b.createdAt as unknown as string,
    })
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title="Dashboard"
        description={formatTanggalPanjang(new Date())}
        actions={
          <LinkButton href="/bugs/new" variant="primary">
            Create issue
          </LinkButton>
        }
      />

      <StatStrip
        items={[
          { label: "Issue aktif", value: formatAngka(jumlahAktif?.n ?? 0) },
          {
            label: "Kritis aktif",
            value: formatAngka(jumlahKritis?.n ?? 0),
            tone: (jumlahKritis?.n ?? 0) > 0 ? "warn" : "default",
          },
          {
            label: "Selesai bulan ini",
            value: formatAngka(jumlahSelesai?.n ?? 0),
          },
          { label: "Issue aktif tertua", value: labelUmur(tertua?.createdAt) },
        ]}
      />

      <Panel title="Status issue" bodyClassName="px-4 py-3">
        <StatusBar data={barStatus} />
      </Panel>

      <Panel
        title="Perlu perhatian"
        actions={
          <Link href="/bugs" className="text-sm font-semibold text-accent hover:underline">
            View all
          </Link>
        }
        bodyClassName="pb-0"
      >
        {perluPerhatian.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-ink-2">No active issues.</p>
            <div className="mt-3 flex justify-center">
              <LinkButton href="/bugs/new" variant="default">
                Create issue
              </LinkButton>
            </div>
          </div>
        ) : (
          <div>
            {perluPerhatian.map((bug) => (
              <BugRow key={bug.id} bug={bug} />
            ))}
          </div>
        )}
      </Panel>

      <p className="text-xs text-ink-3">
        Filter project berlaku untuk semua halaman. Pilih dari menu Project di
        sidebar.
      </p>
    </div>
  );
}

/** "Rabu, 9 Okt 2026" */
function formatTanggalPanjang(d: Date): string {
  const hari = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  }).format(d);
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  return `${hari}, ${tanggal}`;
}

function labelUmur(createdAt: string | null | undefined): string {
  if (!createdAt) return "-";
  const hari = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 86400000
  );
  return `${formatAngka(Math.max(0, hari))} d`;
}

/** Tanggal hari ini di zona Asia/Jakarta, format YYYY-MM-DD. */
function todayJakarta(): string {
  const now = new Date();
  const wib = new Date(
    now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000
  );
  return wib.toISOString().slice(0, 10);
}