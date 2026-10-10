import { Skeleton } from "@/components/ui";

/**
 * Skeleton bentuk halaman daftar: judul, toolbar, lalu baris tabel.
 * Tampil selagi server mengambil data.
 */
export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1.5 h-3 w-24" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-[220px]" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="border-b border-line bg-surface-2 px-4 py-2">
          <Skeleton className="h-3 w-32" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-line px-4 last:border-b-0"
            style={{ height: "var(--row-h)" }}
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}