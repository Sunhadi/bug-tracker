"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { KpiKlien } from "@/lib/reports-bulanan";
import { formatAngka, formatPersen } from "@/lib/format";

/**
 * Enam KPI laporan Klien. Angka naik dari nol saat halaman muncul; kalau
 * pengguna meminta reduced motion, angkanya langsung tampil.
 */

function useCountUp(target: number, aktif: boolean, durasiMs = 600) {
  const reduced = useReducedMotion();
  const [nilai, setNilai] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!aktif || reduced || target === 0) {
      // Diperbarui lewat rAF, bukan langsung di badan efek, supaya tidak
      // memicu render berantai.
      frame.current = requestAnimationFrame(() => setNilai(target));
      return () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
      };
    }
    const mulai = performance.now();
    const langkah = (waktu: number) => {
      const t = Math.min(1, (waktu - mulai) / durasiMs);
      // easeOutCubic supaya terasa cepat di awal lalu melambat.
      const eased = 1 - Math.pow(1 - t, 3);
      setNilai(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(langkah);
    };
    frame.current = requestAnimationFrame(langkah);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, aktif, durasiMs, reduced]);

  return nilai;
}

/**
 * Angka KPI. Nilai animasi disembunyikan dari pembaca layar dan diganti
 * nilai akhir, supaya html awal (sebelum animasi selesai) tetap terbaca
 * sebagai angka yang benar.
 */
function Nilai({
  nilai,
  akhir,
  suffix = "",
}: {
  nilai: number;
  akhir: number;
  suffix?: string;
}) {
  return (
    <>
      <span aria-hidden="true">
        {formatAngka(nilai)}
        {suffix}
      </span>
      <span className="sr-only">
        {formatAngka(akhir)}
        {suffix}
      </span>
    </>
  );
}

/** Cincin progres untuk Resolution Rate. */
function Cincin({ persen, ukuran = 56 }: { persen: number; ukuran?: number }) {
  const r = (ukuran - 8) / 2;
  const keliling = 2 * Math.PI * r;
  const isi = Math.max(0, Math.min(1, persen / 100));
  return (
    <svg width={ukuran} height={ukuran} aria-hidden="true" className="shrink-0">
      <circle
        cx={ukuran / 2}
        cy={ukuran / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={5}
      />
      <circle
        cx={ukuran / 2}
        cy={ukuran / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={keliling}
        strokeDashoffset={keliling * (1 - isi)}
        transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}
      />
    </svg>
  );
}

interface KartuProps {
  label: string;
  nilai: React.ReactNode;
  keterangan: string;
  nada?: "default" | "turun" | "naik" | "netral";
  children?: React.ReactNode;
}

function Kartu({ label, nilai, keterangan, nada = "default", children }: KartuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="flex items-start justify-between gap-3 rounded-panel border border-line bg-surface px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink-2">{label}</p>
        <p className="num mt-0.5 text-[26px] leading-8 font-bold text-ink">{nilai}</p>
        <p
          className={`mt-0.5 text-xs leading-4 ${
            nada === "turun"
              ? "text-ok"
              : nada === "naik"
                ? "text-danger"
                : "text-ink-3"
          }`}
        >
          {keterangan}
        </p>
      </div>
      {children}
    </motion.div>
  );
}

export default function KpiGrid({ kpi }: { kpi: KpiKlien }) {
  const total = useCountUp(kpi.totalBug, true);
  const terakhir = useCountUp(kpi.bug7Terakhir, true);
  const sebelumnya = useCountUp(kpi.bug7Sebelumnya, true, 900);
  const belum = useCountUp(kpi.belumSelesai, true, 700);
  const rate = useCountUp(
    kpi.resolutionRate === null ? 0 : Math.round(kpi.resolutionRate * 100),
    true,
    800
  );

  // Keterangan "Total Bug Tercatat": "{x} bug awal + {y} bug baru {tanggal}".
  const sebelumAcuan = kpi.totalBug - kpi.bug7Terakhir;

  const perubahan = kpi.perubahan;
  const nadaPerubahan =
    perubahan === null ? "netral" : perubahan < -0.001 ? "turun" : perubahan > 0.001 ? "naik" : "netral";
  const persenPerubahan =
    perubahan === null ? "n/a" : `${formatPersen(Math.abs(perubahan) * 100)}`;
  const IconPerubahan =
    perubahan === null || Math.abs(perubahan) < 0.001
      ? ArrowRight
      : perubahan < 0
        ? ArrowDown
        : ArrowUp;
  const kalimatPerubahan =
    perubahan === null
      ? "Tidak ada pembanding"
      : Math.abs(perubahan) < 0.001
        ? "Stabil dibanding 7 hari sebelumnya"
        : `${perubahan < 0 ? "Turun" : "Naik"} ${persenPerubahan} dibanding 7 hari sebelumnya`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Kartu
        label="Total Bug Tercatat"
        nilai={<Nilai nilai={total} akhir={kpi.totalBug} />}
        keterangan={`${formatAngka(Math.max(0, sebelumAcuan))} bug awal + ${formatAngka(kpi.bug7Terakhir)} bug baru ${kpi.rentangTerakhir.split(" - ")[1] ?? ""}`}
      />
      <Kartu
        label="Bug 7 Hari Terakhir"
        nilai={<Nilai nilai={terakhir} akhir={kpi.bug7Terakhir} />}
        keterangan={kpi.rentangTerakhir}
      />
      <Kartu
        label="Bug 7 Hari Sebelumnya"
        nilai={<Nilai nilai={sebelumnya} akhir={kpi.bug7Sebelumnya} />}
        keterangan={kpi.rentangSebelumnya}
      />
      <Kartu
        label="Perubahan Mingguan"
        nilai={`${perubahan !== null && perubahan < 0 ? "-" : ""}${persenPerubahan}`}
        keterangan={kalimatPerubahan}
        nada={nadaPerubahan === "netral" ? "default" : nadaPerubahan}
      >
        <span
          className={`mt-1 ${
            nadaPerubahan === "turun"
              ? "text-ok"
              : nadaPerubahan === "naik"
                ? "text-danger"
                : "text-ink-3"
          }`}
        >
          <IconPerubahan size={20} aria-hidden="true" />
        </span>
      </Kartu>
      <Kartu
        label="Bug Belum Selesai"
        nilai={<Nilai nilai={belum} akhir={kpi.belumSelesai} />}
        keterangan={`${formatAngka(kpi.belumSelesai)} masih On Progress`}
        nada={kpi.belumSelesai > 0 ? "naik" : "default"}
      />
      <Kartu
        label="Resolution Rate"
        nilai={<><span aria-hidden="true">{formatPersen(rate)}</span><span className="sr-only">{formatPersen(kpi.resolutionRate ?? 0)}</span></>}
        keterangan={`${formatAngka(kpi.selesai)} dari ${formatAngka(kpi.totalBug)} bug sudah selesai`}
      >
        <span className="mt-0.5 flex items-center gap-2">
          <Cincin persen={rate} />
        </span>
      </Kartu>
    </div>
  );
}