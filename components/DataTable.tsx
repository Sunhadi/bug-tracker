"use client";

import type { ReactNode } from "react";
import { ErrorState, Skeleton, TableSkeleton } from "./ui";

export interface Kolom<T> {
  key: string;
  header?: string;
  render: (row: T) => ReactNode;
  /** Kelas untuk sel dan header sekaligus, mis. "w-[130px]". */
  className?: string;
  headerClassName?: string;
}

/**
 * Tabel data bergaya Jira: header kecil uppercase, baris 40 px,
 * header lengket, baris bisa difokus dan dibuka dengan Enter atau klik.
 * Menyediakan state memuat, kosong, dan galat.
 */
export function DataTable<T>({
  kolom,
  rows,
  getKey,
  onOpenRow,
  loading = false,
  error = null,
  onCobaLagi,
  kosong,
  className = "",
}: {
  kolom: Kolom<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  onOpenRow?: (row: T) => void;
  loading?: boolean;
  error?: string | null;
  onCobaLagi?: () => void;
  kosong: ReactNode;
  className?: string;
}) {
  if (error) {
    return <ErrorState pesan={error} onCobaLagi={onCobaLagi} />;
  }

  if (loading) {
    return <TableSkeleton columns={kolom.length} />;
  }

  if (rows.length === 0) {
    return <>{kosong}</>;
  }

  return (
    <div className={`scroll-x ${className}`}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            {kolom.map((k) => (
              <th
                key={k.key}
                scope="col"
                className={`border-b border-line px-3 py-2 text-left text-[11px] leading-4 font-bold tracking-wide text-ink-2 uppercase ${k.className ?? ""} ${k.headerClassName ?? ""}`}
              >
                {k.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              tabIndex={onOpenRow ? 0 : undefined}
              onClick={onOpenRow ? () => onOpenRow(row) : undefined}
              onKeyDown={
                onOpenRow
                  ? (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onOpenRow(row);
                      }
                    }
                  : undefined
              }
              className={`border-b border-line transition-colors duration-[120ms] last:border-b-0 ${
                onOpenRow
                  ? "cursor-pointer hover:bg-accent-soft focus-visible:bg-accent-soft"
                  : ""
              }`}
              style={{ height: "var(--row-h)" }}
            >
              {kolom.map((k) => (
                <td
                  key={k.key}
                  className={`px-3 py-1 align-middle text-[13px] leading-5 text-ink-2 ${k.className ?? ""}`}
                >
                  {k.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div
      className="flex items-center gap-3 border-b border-line px-3 last:border-b-0"
      style={{ height: "var(--row-h)" }}
      aria-hidden="true"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === 0 ? "w-[64px]" : "w-[16%]"}`} />
      ))}
    </div>
  );
}