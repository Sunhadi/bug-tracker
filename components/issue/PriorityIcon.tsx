"use client";

/**
 * Ikon priority seperti Jira: panah, bukan teks.
 * High = panah dobel naik merah, Medium = dua garis oranye,
 * Low = panah turun biru. Teks muncul di tooltip dan untuk pembaca layar.
 */
export function PriorityIcon({
  priority,
  denganTeks = false,
  className = "",
}: {
  priority: number;
  denganTeks?: boolean;
  className?: string;
}) {
  const meta = PRIORITY[priority] ?? PRIORITY[2];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`Priority ${meta.label}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="shrink-0"
      >
        {meta.arah === "naik" ? (
          <>
            <path d="M6 0l4 4H2z" fill={meta.warna} />
            <path d="M6 5l4 4H2z" fill={meta.warna} />
          </>
        ) : meta.arah === "turun" ? (
          <>
            <path d="M6 12L2 8h8z" fill={meta.warna} />
            <path d="M6 7L2 3h8z" fill={meta.warna} />
          </>
        ) : (
          <>
            <path d="M2 4.5h8v1.4H2z" fill={meta.warna} />
            <path d="M2 7.1h8v1.4H2z" fill={meta.warna} />
          </>
        )}
      </svg>
      <span className="sr-only">Priority {meta.label}</span>
      {denganTeks && (
        <span className="text-xs font-medium" style={{ color: meta.warna }}>
          {meta.label}
        </span>
      )}
    </span>
  );
}

const PRIORITY: Record<
  number,
  { label: string; warna: string; arah: "naik" | "turun" | "datar" }
> = {
  1: { label: "High", warna: "#C9372C", arah: "naik" },
  2: { label: "Medium", warna: "#E56910", arah: "datar" },
  3: { label: "Low", warna: "#357DE8", arah: "turun" },
};

export function warnaPriority(priority: number): string {
  return (PRIORITY[priority] ?? PRIORITY[2]).warna;
}

export function labelPriority(priority: number): string {
  return (PRIORITY[priority] ?? PRIORITY[2]).label;
}