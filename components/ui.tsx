import type { ReactNode, InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import {
  SEVERITY_JIRA,
  STATUS_JIRA,
  namaStatus,
  warnaStatus,
  TAHAP_SIKLUS,
} from "@/lib/jira";

type InfoStatus = {
  label: string;
  kapital: string;
  bg: string;
  fg: string;
  rail: string;
};

function jiraStatus(status: string): InfoStatus {
  return (
    (STATUS_JIRA as Record<string, InfoStatus>)[status] ?? {
      label: status,
      kapital: status.toUpperCase(),
      bg: "#DCDFE4",
      fg: "#44546F",
      rail: "#97A0AF",
    }
  );
}

export function kelasSeverity(severity: string) {
  return (
    SEVERITY_JIRA[severity] ?? {
      label: severity,
      rail: "bg-sev-rendah",
      fg: "text-sev-rendah-fg",
      bg: "bg-sev-rendah-bg",
      hex: "#626F86",
    }
  );
}

/** Rel severity 3 px di tepi kiri baris atau kartu. */
export function SeverityRail({ severity }: { severity: string }) {
  const { rail } = kelasSeverity(severity);
  return (
    <span
      aria-hidden="true"
      className={`block w-[3px] shrink-0 self-stretch rounded-full ${rail}`}
    />
  );
}

/**
 * Chip severity. Di tabel hanya perlu muncul bila bukan "Sedang",
 * supaya deretan tidak ramai. Label tetap ada sebagai teks.
 */
export function SeverityChip({
  severity,
  rapat = false,
}: {
  severity: string;
  rapat?: boolean;
}) {
  const { fg, bg, label } = kelasSeverity(severity);
  return (
    <span
      className={`inline-flex items-center rounded-control font-medium ${bg} ${fg} ${
        rapat ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      {label}
    </span>
  );
}

/**
 * Lozenge status: huruf kapital, tebal, 11 px, radius 3 px.
 * Warna diambil dari lib/jira.ts bagian 3.2.
 */
export function Lozenge({
  status,
  denganCaret = false,
  className = "",
}: {
  status: string;
  denganCaret?: boolean;
  className?: string;
}) {
  const info = jiraStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${className}`}
      style={{ background: info.bg, color: info.fg }}
    >
      {info.kapital}
      {denganCaret && (
        <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true">
          <path d="M0 0h8L4 5z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}


/** Strip siklus lima tahap; hanya untuk status yang punya siklus. */
export function StatusCycle({
  status,
  showLabel = true,
  size = "md",
}: {
  status: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  if (status === "ditolak" || status === "dibuka_ulang") {
    return showLabel ? <Lozenge status={status} /> : null;
  }
  const index = TAHAP_SIKLUS.indexOf(status as never);
  const kelasSegmen = size === "sm" ? "h-[4px] w-2.5" : "h-1 w-3";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-[2px]" aria-hidden="true">
        {TAHAP_SIKLUS.map((s, i) => (
          <span
            key={s}
            className={`${kelasSegmen} rounded-full ${
              i <= index ? "bg-accent" : "bg-line-strong"
            }`}
          />
        ))}
      </span>
      {showLabel && <Lozenge status={status} />}
    </span>
  );
}

// ---------------------------------------------------------------- kontrol

type VarianTombol = "primary" | "default" | "subtle" | "danger" | "link";

const GAYA_TOMBOL: Record<VarianTombol, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed border border-transparent",
  default:
    "bg-surface-hover text-ink hover:bg-line border border-transparent",
  subtle: "bg-transparent text-ink-2 hover:bg-surface-hover border border-transparent",
  danger: "bg-transparent text-danger hover:bg-danger/10 border border-transparent",
  link: "bg-transparent text-accent hover:underline border border-transparent px-0",
};

export function Button({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: VarianTombol;
  size?: "sm" | "md";
}) {
  const tinggi = size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm";
  return (
    <button
      {...props}
      className={`btn inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition-[background-color,color,transform,box-shadow] duration-[var(--dur-instant)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${GAYA_TOMBOL[variant]} ${tinggi} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: VarianTombol;
  size?: "sm" | "md";
}) {
  const tinggi = size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm";
  return (
    <a
      {...props}
      className={`btn inline-flex items-center justify-center gap-1.5 rounded-control font-medium no-underline transition-[background-color,color,transform,box-shadow] duration-[var(--dur-instant)] active:scale-[0.98] ${GAYA_TOMBOL[variant]} ${tinggi} ${className}`}
    >
      {children}
    </a>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
}) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`btn inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={`h-8 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink transition-colors duration-[var(--dur-fast)] placeholder:text-ink-3 focus:border-accent focus:outline-none ${className}`}
    />
  );
});

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-control border border-line-strong bg-surface px-2 py-1.5 text-sm leading-5 text-ink transition-colors duration-[var(--dur-fast)] placeholder:text-ink-3 focus:border-accent focus:outline-none ${className}`}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-8 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink transition-colors duration-[var(--dur-fast)] focus:border-accent focus:outline-none ${className}`}
    >
      {children}
    </select>
  );
}

// ---------------------------------------------------------------- kerangka

export function Breadcrumb({
  crumbs,
}: {
  crumbs: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs">
      {crumbs.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className="text-ink-3">
              /
            </span>
          )}
          {c.href ? (
            <a
              href={c.href}
              className="text-ink-2 transition-colors duration-[var(--dur-fast)] hover:text-accent hover:underline"
            >
              {c.label}
            </a>
          ) : (
            <span className="text-ink-2">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] leading-6 font-bold tracking-[-0.01em] text-ink">
            {title}
          </h1>
          {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-panel border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          {title && (
            <h2 className="text-[16px] leading-5 font-semibold text-ink">{title}</h2>
          )}
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatStrip({
  items,
}: {
  items: { label: string; value: ReactNode; tone?: "default" | "warn" }[];
}) {
  return (
    <div className="grid overflow-hidden rounded-panel border border-line bg-surface sm:grid-flow-col">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`px-4 py-2.5 ${i > 0 ? "border-t border-line sm:border-t-0 sm:border-l" : ""}`}
        >
          <p
            className={`num text-[24px] leading-7 font-bold ${
              item.tone === "warn" ? "text-warning" : "text-ink"
            }`}
          >
            {item.value}
          </p>
          <p className="text-xs leading-4 font-medium text-ink-3">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi?: string;
  aksi?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <p className="text-sm font-semibold text-ink">{judul}</p>
      {deskripsi && <p className="max-w-[60ch] text-sm text-ink-2">{deskripsi}</p>}
      {aksi && <div className="mt-1">{aksi}</div>}
    </div>
  );
}

export function ErrorState({
  pesan,
  onCobaLagi,
}: {
  pesan: string;
  onCobaLagi?: () => void;
}) {
  return (
    <EmptyState
      judul="Gagal memuat data"
      deskripsi={pesan}
      aksi={
        onCobaLagi && (
          <Button variant="default" onClick={onCobaLagi}>
            Coba lagi
          </Button>
        )
      }
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-control bg-line/70 ${className}`} aria-hidden="true" />
  );
}

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-control bg-line/70 ${className}`}
      style={{ animationDuration: "1.4s" }}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({
  rows = 10,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-3 px-4"
          style={{ height: "var(--row-h)" }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Shimmer key={c} className={`h-3 ${c === 1 ? "w-[40%]" : "w-[9%]"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export { namaStatus, warnaStatus };

/** Penghitung karakter. Status bukan satu-satunya pembawa informasi. */
export function CharCounter({
  panjang,
  minimum = 100,
}: {
  panjang: number;
  minimum?: number;
}) {
  const kurang = panjang < minimum;
  const selisih = minimum - panjang;
  return (
    <p
      className={`num text-xs leading-4 font-medium ${kurang ? "text-warning" : "text-success"}`}
    >
      {panjang} / {minimum} min ·{" "}
      {kurang ? `Kurang ${selisih} karakter` : "Cukup"}
    </p>
  );
}