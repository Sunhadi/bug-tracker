"use client";

import type { BarisHarian } from "@/lib/reports-bulanan";
import { formatAngka, formatHariPendek } from "@/lib/format";

/**
 * Tabel harian laporan Klien. Satu baris untuk setiap tanggal dalam bulan,
 * termasuk yang nol, supaya turun-naiknya jumlah bug terbaca.
 */
export default function TabelHarian({ harian }: { harian: BarisHarian[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
            <th scope="col" className="px-4 py-2 font-semibold">Tanggal</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Bug Baru</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Temuan Non-Bug</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Total Temuan</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">7-Day Avg Bug</th>
            <th scope="col" className="px-4 py-2 text-center font-semibold">Arah Harian</th>
          </tr>
        </thead>
        <tbody>
          {harian.map((h) => (
            <tr
              key={h.tanggal}
              className="border-b border-line/60 transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-accent-soft/40"
            >
              <td className="num px-4 py-1.5 whitespace-nowrap">{formatHariPendek(h.tanggal)}</td>
              <td className="num px-3 py-1.5 text-right font-semibold">{h.bugBaru}</td>
              <td className="num px-3 py-1.5 text-right text-ink-2">{h.nonBug}</td>
              <td className="num px-3 py-1.5 text-right text-ink-2">{h.total}</td>
              <td className="num px-3 py-1.5 text-right text-ink-2">
                {formatAngka(h.avg7)}
              </td>
              <td className="px-4 py-1.5 text-center">
                <Arah nilai={h.arah} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Panah arah harian: naik merah, turun hijau, stabil abu, baseline netral. */
function Arah({ nilai }: { nilai: BarisHarian["arah"] }) {
  const meta = {
    naik: { label: "Naik", warna: "text-danger", panah: "▲" },
    turun: { label: "Turun", warna: "text-ok", panah: "▼" },
    stabil: { label: "Stabil", warna: "text-ink-3", panah: "—" },
    baseline: { label: "Baseline", warna: "text-ink-3", panah: "" },
  }[nilai];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${meta.warna}`}>
      {meta.panah && <span aria-hidden="true">{meta.panah}</span>}
      {meta.label}
    </span>
  );
}