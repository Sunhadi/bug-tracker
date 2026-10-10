"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { geserBulan, namaBulanPanjang } from "@/lib/date";

/**
 * Kontrol di atas laporan bulanan: pemilih bulan, pemilih project,
 * tombol export dan cetak. Semua perubahan ditulis ke URL supaya laporan
 * bisa dibagikan dan tetap hidup saat halaman di-refresh.
 */

interface Props {
  bulan: string;
  projectId: number | null;
  proyek: { id: number; name: string }[];
  /** Label tab aktif, dipakai untuk judul dokumen saat dicetak. */
  tab: string;
}

export default function KontrolBulanan({ bulan, projectId, proyek, tab }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function navigasi(perubahan: Record<string, string | null>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(perubahan)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    start(() => router.replace(qs ? `?${qs}` : "?", { scroll: false }));
  }

  // Daftar bulan: 24 bulan ke belakang dari bulan terpilih.
  const bulanList = Array.from({ length: 24 }, (_, i) => geserBulan(bulan, i - 23));

  const qs = sp.toString();
  const exportUrl = `/api/reports/export?type=bulanan&bulan=${bulan}${
    projectId ? `&project_id=${projectId}` : ""
  }`;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`}
      data-bulanan-tab={tab}
    >
      {/* Pemilih bulan */}
      <div className="flex items-center rounded-control border border-line-strong bg-surface">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          title="Bulan sebelumnya"
          onClick={() => navigasi({ bulan: geserBulan(bulan, -1) })}
          className="flex h-8 w-8 items-center justify-center rounded-l-control text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="num min-w-[112px] px-1 text-center text-sm font-semibold text-ink">
          {namaBulanPanjang(bulan)}
        </span>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          title="Bulan berikutnya"
          onClick={() => navigasi({ bulan: geserBulan(bulan, 1) })}
          className="flex h-8 w-8 items-center justify-center rounded-r-control text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <Select
        aria-label="Pilih bulan"
        value={bulan}
        onChange={(e) => navigasi({ bulan: e.target.value })}
        className="num w-[136px]"
      >
        {[...bulanList].reverse().map((b) => (
          <option key={b} value={b}>
            {namaBulanPanjang(b)}
          </option>
        ))}
      </Select>

      {/* Pemilih project */}
      <Select
        aria-label="Pilih project"
        value={projectId ?? ""}
        onChange={(e) =>
          navigasi({ project_id: e.target.value === "" ? null : e.target.value })
        }
        className="max-w-[200px]"
      >
        <option value="">Semua project</option>
        {proyek.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Link href={exportUrl} prefetch={false} download>
          <Button variant="default">
            <Download size={14} />
            Export Excel
          </Button>
        </Link>
        <Button variant="default" onClick={() => window.print()}>
          <Printer size={14} />
          Cetak
        </Button>
      </div>

      {/* Memakai ulang query string halaman ini setelah navigasi. */}
      <span className="sr-only" aria-hidden="true">
        {qs}
      </span>
    </div>
  );
}