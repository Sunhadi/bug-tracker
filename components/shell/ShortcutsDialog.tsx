"use client";

import { useEffect } from "react";

const DAFTAR: { kunci: string; aksi: string; kelompok: string }[] = [
  { kunci: "Ctrl K", aksi: "Buka command palette", kelompok: "Umum" },
  { kunci: "/", aksi: "Fokus ke kolom cari", kelompok: "Umum" },
  { kunci: "C", aksi: "Buat issue", kelompok: "Umum" },
  { kunci: "G lalu D", aksi: "Ke ringkasan", kelompok: "Navigasi" },
  { kunci: "G lalu I", aksi: "Ke daftar issue", kelompok: "Navigasi" },
  { kunci: "G lalu B", aksi: "Ke board", kelompok: "Navigasi" },
  { kunci: "G lalu L", aksi: "Ke laporan harian", kelompok: "Navigasi" },
  { kunci: "G lalu M", aksi: "Ke laporan bulanan", kelompok: "Navigasi" },
  { kunci: "G lalu T", aksi: "Ke trend", kelompok: "Navigasi" },
  { kunci: "J", aksi: "Baris berikutnya di daftar", kelompok: "Daftar issue" },
  { kunci: "K", aksi: "Baris sebelumnya di daftar", kelompok: "Daftar issue" },
  { kunci: "Enter", aksi: "Buka issue terpilih", kelompok: "Daftar issue" },
  { kunci: "A", aksi: "Ubah assignee", kelompok: "Issue terbuka" },
  { kunci: "S", aksi: "Ubah status", kelompok: "Issue terbuka" },
  { kunci: "?", aksi: "Daftar pintasan ini", kelompok: "Umum" },
  { kunci: "Esc", aksi: "Tutup lapisan teratas", kelompok: "Umum" },
];

export function ShortcutsDialog({
  terbuka,
  onTutup,
}: {
  terbuka: boolean;
  onTutup: () => void;
}) {
  useEffect(() => {
    if (!terbuka) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onTutup();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [terbuka, onTutup]);

  if (!terbuka) return null;

  const kelompok = [...new Set(DAFTAR.map((d) => d.kelompok))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Daftar pintasan"
        className="shadow-modal max-h-[80vh] w-full max-w-[520px] overflow-y-auto rounded-pop border border-line bg-surface p-4"
      >
        <h2 className="mb-3 text-base font-bold text-ink">Daftar pintasan</h2>
        {kelompok.map((k) => (
          <div key={k} className="mb-4 last:mb-0">
            <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-3 uppercase">
              {k}
            </p>
            <table className="w-full text-sm">
              <tbody>
                {DAFTAR.filter((d) => d.kelompok === k).map((d) => (
                  <tr key={d.kunci + d.aksi}>
                    <td className="w-[110px] py-1">
                      <kbd className="rounded-control border border-line px-1.5 py-0.5 text-xs text-ink-2">
                        {d.kunci}
                      </kbd>
                    </td>
                    <td className="py-1 text-ink-2">{d.aksi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p className="mt-2 text-xs text-ink-3">
          Pintasan tidak aktif saat fokus ada di kolom isian.
        </p>
      </div>
    </div>
  );
}