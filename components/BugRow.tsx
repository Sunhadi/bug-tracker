import type { ReactNode } from "react";
import Link from "next/link";
import { namaPrioritas, SEVERITY_JIRA, TAHAP_SIKLUS, warnaStatus, namaStatus } from "@/lib/jira";
import { formatRelatif, formatTanggal, formatUmur, inisial } from "@/lib/format";
import { SeverityChip, SeverityRail, Lozenge } from "./ui";

export interface BarisBug {
  id: number;
  code: string | null;
  title: string;
  status: string;
  severity: string;
  priority: number;
  createdAt: string | Date;
  reporterName?: string | null;
  assigneeName?: string | null;
  componentName?: string | null;
}

/** Kolom tanggal: relatif kalau masih baru, kalau tidak tanggal lengkap. */
export function KolomTanggal({ createdAt }: { createdAt: string | Date }) {
  const relatif = formatRelatif(createdAt);
  const absolut = formatTanggal(createdAt);
  return (
    <span title={absolut}>
      {relatif ?? absolut}
      {relatif && <span className="ml-1 text-ink-3">({absolut})</span>}
    </span>
  );
}

/** Urutan "perlu perhatian": severity dulu, lalu yang paling lama. */
export function urutkanPerluPerhatian<
  T extends { severity: string; createdAt: string | Date },
>(list: T[]): T[] {
  const urutan: Record<string, number> = {
    kritis: 0,
    tinggi: 1,
    sedang: 2,
    rendah: 3,
  };
  return [...list].sort((a, b) => {
    const selisih = (urutan[a.severity] ?? 9) - (urutan[b.severity] ?? 9);
    if (selisih !== 0) return selisih;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Baris issue yang dipakai Dashboard, daftar Issues, dan Laporan Harian.
 * Rel severity di kiri, kode, judul, chip status, dan umur.
 */
export function BugRow({
  bug,
  showComponent = false,
  actions,
}: {
  bug: BarisBug;
  showComponent?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div
      className="flex items-stretch gap-2.5 border-b border-line px-3 last:border-b-0"
      style={{ minHeight: "var(--row-h)" }}
    >
      <SeverityRail severity={bug.severity} />

      <span className="code w-[76px] shrink-0 self-center text-xs text-ink-3">
        {bug.code ?? "-"}
      </span>

      <Link
        href={`/bugs/${bug.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 self-center py-2 text-sm text-accent no-underline transition-colors duration-[120ms] hover:underline"
      >
        <span className="truncate font-medium">{bug.title}</span>
        {showComponent && bug.componentName && (
          <span className="shrink-0 text-xs text-ink-3">{bug.componentName}</span>
        )}
      </Link>

      <span className="hidden shrink-0 self-center sm:block">
        <SeverityChip severity={bug.severity} />
      </span>

      <span className="hidden shrink-0 self-center md:block">
        <Lozenge status={bug.status} />
      </span>

      <span
        className="num w-[92px] shrink-0 self-center text-right text-xs text-ink-2"
        title={`Dibuat ${formatTanggal(bug.createdAt)}`}
      >
        {formatUmur(bug.createdAt)}
      </span>

      {actions && <span className="shrink-0 self-center">{actions}</span>}
    </div>
  );
}

/** Inisial assignee dalam lingkaran, seperti Jira. */
export function AvatarInitials({
  nama,
  size = 24,
}: {
  nama: string | null | undefined;
  size?: number;
}) {
  const teks = inisial(nama);
  return (
    <span
      title={nama ?? "Belum ditugaskan"}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-bg font-bold text-ink-2"
    >
      {teks}
    </span>
  );
}

/**
 * Bar status bertumpuk untuk Dashboard. Tinggi 8 px, warna mengikuti
 * warna status Jira.
 */
export function StatusBar({
  data,
}: {
  data: { status: string; label: string; jumlah: number }[];
}) {
  const total = data.reduce((n, d) => n + d.jumlah, 0);
  const ada = data.filter((d) => d.jumlah > 0);

  if (total === 0 || ada.length === 0) {
    return <p className="text-sm text-ink-3">Tidak ada issue aktif.</p>;
  }

  return (
    <div>
      <div
        className="flex h-2 w-full gap-[2px] overflow-hidden"
        role="img"
        aria-label={ada.map((d) => `${d.label} ${d.jumlah}`).join(", ")}
      >
        {ada.map((d) => (
          <span
            key={d.status}
            style={{
              width: `${(d.jumlah / total) * 100}%`,
              background: warnaStatus(d.status),
            }}
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {ada.map((d) => (
          <li key={d.status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ background: warnaStatus(d.status) }}
            />
            <span className="text-xs text-ink-2">{d.label}</span>
            <span className="num text-xs font-bold text-ink">{d.jumlah}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Strip siklus versi penuh, dipakai di header detail issue. */
export function StatusCyclePenuh({ status }: { status: string }) {
  if (status === "ditolak" || status === "dibuka_ulang") {
    return <Lozenge status={status} />;
  }
  const index = TAHAP_SIKLUS.indexOf(status as never);
  return (
    <span className="inline-flex items-center gap-3">
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {TAHAP_SIKLUS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 w-6 rounded-full ${
              i <= index ? "bg-accent" : "bg-line-strong"
            }`}
          />
        ))}
      </span>
      <Lozenge status={status} />
    </span>
  );
}

export { namaPrioritas, namaStatus, SEVERITY_JIRA };