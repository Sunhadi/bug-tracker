"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BarisHarian } from "@/lib/reports-bulanan";
import { formatAngka, formatHariPendek } from "@/lib/format";

/**
 * Dua grafik laporan Klien:
 * - tren bug baru harian dengan garis rata-rata 7 hari
 * - bug vs temuan non-bug per hari (batang bertumpuk)
 */

const WARNA_BUG = "#0C66E4";
const WARNA_NON_BUG = "#97A0AF";
const WARNA_RATA = "#FF8B00";
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
            <span>{p.name}</span>
            <span className="num ml-auto pl-3 font-semibold text-ink">
              {formatAngka(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function keData(harian: BarisHarian[]) {
  return harian.map((h) => ({
    tanggal: formatHariPendek(h.tanggal),
    "Bug Baru": h.bugBaru,
    "Rata-rata 7 hari": h.avg7,
    "Temuan Non-Bug": h.nonBug,
  }));
}

export function GrafikBugHarian({ harian }: { harian: BarisHarian[] }) {
  const data = keData(harian);
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 2" />
          <XAxis dataKey="tanggal" stroke={GRID} tick={{ fill: TEKS, fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <Tooltip content={<TooltipTabel />} />
          <Area
            type="monotone"
            dataKey="Bug Baru"
            stroke={WARNA_BUG}
            strokeWidth={2.5}
            fill={WARNA_BUG}
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Rata-rata 7 hari"
            stroke={WARNA_RATA}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrafikBugVsNonBug({ harian }: { harian: BarisHarian[] }) {
  const data = keData(harian).filter((d) => d["Bug Baru"] > 0 || d["Temuan Non-Bug"] > 0);
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 2" />
          <XAxis dataKey="tanggal" stroke={GRID} tick={{ fill: TEKS, fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} stroke={GRID} tick={{ fill: TEKS, fontSize: 11 }} />
          <Tooltip content={<TooltipTabel />} cursor={{ fill: "rgba(9,30,66,0.04)" }} />
          <ReferenceLine y={0} stroke={GRID} />
          <Bar
            dataKey="Bug Baru"
            stackId="temuan"
            fill={WARNA_BUG}
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="Temuan Non-Bug"
            stackId="temuan"
            fill={WARNA_NON_BUG}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}