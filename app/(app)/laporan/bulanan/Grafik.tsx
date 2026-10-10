"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BarisKategori, BarisTanggal, BarisSelesai } from "@/lib/reports-bulanan";
import { formatAngka, formatHariPendek } from "@/lib/format";

/**
 * Grafik laporan bulanan. Satu warna aksen untuk data utama; warna kategori
 * mengikuti kolom color di bug_categories supaya konsisten dengan tabel.
 */

const WARNA_TOTAL = "#0C66E4";
const WARNA_KUMULATIF = "#1F845A";
const GRID = "#DFE1E6";
const TEKS = "#626F86";

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}

function TooltipTabel({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-line bg-surface px-2.5 py-2 shadow-[var(--shadow-overlay)]">
      <p className="num mb-1 text-xs font-semibold text-ink">{String(label)}</p>
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-ink-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color }}
            />
            <span className="truncate">{p.name}</span>
            <span className="num ml-auto pl-3 font-semibold text-ink">
              {formatAngka(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================ batang kategori

export function GrafikKategoriBatang({ data }: { data: BarisKategori[] }) {
  const baris = useMemo(
    () =>
      data.map((d) => ({
        kategori: d.kategori,
        jumlah: d.jumlah,
        persen: Number(d.persen.toFixed(1)),
        fill: d.color,
      })),
    [data]
  );

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={baris}
          layout="vertical"
          margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
          barCategoryGap={6}
        >
          <CartesianGrid
            horizontal={false}
            stroke={GRID}
            strokeDasharray="2 2"
          />
          <XAxis type="number" allowDecimals={false} stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="kategori"
            width={210}
            stroke={GRID}
            tick={{ fill: TEKS, fontSize: 11 }}
          />
          <Tooltip content={<TooltipTabel />} cursor={{ fill: "rgba(9,30,66,0.04)" }} />
          <Bar dataKey="jumlah" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {baris.map((b) => (
              <Cell key={b.kategori} fill={b.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ======================================================= garis per kategori

export function GrafikTrendDibuat({
  data,
  warna,
}: {
  data: BarisTanggal[];
  warna: Record<string, string>;
}) {
  const seri = useMemo(() => {
    const kunci = new Set<string>();
    for (const d of data) for (const k of Object.keys(d.perKategori)) kunci.add(k);
    return [...kunci].sort();
  }, [data]);

  const chart = useMemo(
    () =>
      data.map((d) => {
        const row: Record<string, number | string> = {
          tanggal: formatHariPendek(d.tanggal),
          "Total Bug": d.total,
        };
        for (const k of seri) row[k] = d.perKategori[k] ?? 0;
        return row;
      }),
    [data, seri]
  );

  const [sembunyi, setSembunyi] = useState<string[]>([]);
  const aktif = (nama: string) => !sembunyi.includes(nama);

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 2" />
          <XAxis dataKey="tanggal" stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <YAxis allowDecimals={false} stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <Tooltip content={<TooltipTabel />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
            iconType="plainline"
            iconSize={12}
            onClick={(e) => {
              const nama = String(e.dataKey);
              setSembunyi((s) =>
                s.includes(nama) ? s.filter((x) => x !== nama) : [...s, nama]
              );
            }}
          />
          {seri
            .filter(aktif)
            .map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={warna[k] ?? "#626F86"}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          <Line
            type="monotone"
            dataKey="Total Bug"
            stroke={WARNA_TOTAL}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================== penyelesaian

export function GrafikSelesai({ data }: { data: BarisSelesai[] }) {
  const chart = useMemo(
    () =>
      data.map((d) => ({
        tanggal: formatHariPendek(d.tanggal),
        "Total Selesai": d.selesai,
        Kumulatif: d.kumulatif,
      })),
    [data]
  );

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <defs>
            <linearGradient id="grad-kumulatif" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={WARNA_KUMULATIF} stopOpacity={0.22} />
              <stop offset="100%" stopColor={WARNA_KUMULATIF} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 2" />
          <XAxis dataKey="tanggal" stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <YAxis allowDecimals={false} stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <Tooltip content={<TooltipTabel />} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" iconSize={12} />
          <Area
            type="monotone"
            dataKey="Kumulatif"
            stroke={WARNA_KUMULATIF}
            strokeWidth={1.5}
            fill="url(#grad-kumulatif)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Total Selesai"
            stroke={WARNA_TOTAL}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}