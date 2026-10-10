"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  hitungPersenDibukaUlang,
  pivotBulanan,
  type BarisPivot,
  type TrendResult,
} from "@/lib/trend";
import { formatAngka, formatBulanPenuh, formatBulanRingkas, formatDesimal } from "@/lib/format";
import { SEVERITY_JIRA } from "@/lib/jira";

const WARNA = {
  ditemukan: "#0c66e4",
  selesai: "#5e6c84",
  backlog: "#6554c0",
  dibukaUlang: "#ff5630",
  persen: "#ff8b00",
  rata: "#00b8d9",
};

/** Batas atas dibulatkan ke angka rapi supaya tidak melebihi panel. */
function batasAtas(nilai: number[]): number {
  const maks = Math.max(...nilai, 0);
  if (maks <= 0) return 4;
  const mag = Math.pow(10, Math.floor(Math.log10(maks)));
  return Math.ceil(maks / (mag / 2)) * (mag / 2);
}

export default function TrendCharts({ data }: { data: TrendResult }) {
  const reopenByMonth = new Map(
    data.dibukaUlang.map((r) => [r.bulan, r.dibuka_ulang])
  );

  const garis = data.ditemukanVsSelesai.map((r) => ({
    bulan: r.bulan,
    label: formatBulanRingkas(r.bulan),
    ditemukan: r.ditemukan,
    selesai: r.selesai,
    dibuka_ulang: reopenByMonth.get(r.bulan) ?? 0,
  }));

  const backlog = data.backlog.map((r) => ({
    bulan: r.bulan,
    label: formatBulanRingkas(r.bulan),
    backlog: r.backlog,
  }));

  const severityChart = pivotBulanan(data.perSeverity, (r) => r.severity).map(
    (r) => ({ ...r, label: formatBulanRingkas(String(r.bulan)) })
  );

  const modulChart = pivotBulanan(data.perModul, (r) => r.modul).map((r) => ({
    ...r,
    label: formatBulanRingkas(String(r.bulan)),
  }));

  const rataPerbaikan = data.rataPerbaikan.map((r) => ({
    bulan: r.bulan,
    label: formatBulanRingkas(r.bulan),
    hari: r.rata_hari,
  }));

  const persen: Array<{
    bulan: string;
    label: string;
    persen: number;
  }> = hitungPersenDibukaUlang(data).map((r) => ({
    bulan: r.bulan,
    label: formatBulanRingkas(r.bulan),
    persen: r.persen,
  }));

  const totalDitemukan = garis.reduce((n, r) => n + r.ditemukan, 0);
  const totalSelesai = garis.reduce((n, r) => n + r.selesai, 0);
  const backlogAkhir = backlog.at(-1)?.backlog ?? 0;
  const persenRata =
    totalSelesai > 0
      ? Math.round(
          (garis.reduce((n, r) => n + r.dibuka_ulang, 0) / totalSelesai) * 100
        )
      : 0;

  const semuaNol = totalDitemukan === 0 && totalSelesai === 0;

  return (
    <div className="space-y-3">
      <div className="grid overflow-hidden rounded-panel border border-line bg-surface sm:grid-flow-col">
        {[
          { label: "Found", value: formatAngka(totalDitemukan) },
          { label: "Done", value: formatAngka(totalSelesai) },
          { label: "Backlog", value: formatAngka(backlogAkhir) },
          { label: "Reopened", value: `${persenRata}%` },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-4 py-2.5 ${i > 0 ? "border-t border-line sm:border-t-0 sm:border-l" : ""}`}
          >
            <p className="num text-[22px] leading-7 font-bold text-ink">{s.value}</p>
            <p className="text-xs font-medium text-ink-3">{s.label}</p>
          </div>
        ))}
      </div>

      {semuaNol ? (
        <div className="rounded-panel border border-line bg-surface">
          <p className="py-16 text-center text-sm text-ink-2">
            No data in this range.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel judul="Found vs Done">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={garis} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  allowDecimals={false}
                  domain={[0, batasAtas(garis.flatMap((r) => [r.ditemukan, r.selesai]))]}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [formatAngka(v), n]}
                  labelFormatter={(l) => {
                    const row = garis.find((r) => r.label === l);
                    return row ? formatBulanPenuh(row.bulan) : String(l);
                  }}
                />
                <Legend />
                <Line
                  type="linear"
                  dataKey="ditemukan"
                  name="Found"
                  stroke={WARNA.ditemukan}
                  strokeWidth={2}
                  dot={{ r: 3, fill: WARNA.ditemukan }}
                />
                <Line
                  type="linear"
                  dataKey="selesai"
                  name="Done"
                  stroke={WARNA.selesai}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: WARNA.selesai }}
                  activeDot={{ r: 5, fill: WARNA.selesai }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel judul="Backlog at month end">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={backlog} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatAngka(v), "Backlog"]} />
                <Bar dataKey="backlog" fill={WARNA.backlog} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel judul="By severity">
            {severityChart.length === 0 ? (
              <Kosong />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={severityChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {Object.entries(SEVERITY_JIRA)
                    .filter(([k]) =>
                      severityChart.some(
                        (r) => (r as BarisPivot)[k] !== undefined
                      )
                    )
                    .map(([k, v]) => (
                      <Bar
                        key={k}
                        dataKey={k}
                        name={v.label}
                        stackId="a"
                        fill={v.hex}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel judul="By component">
            {modulChart.length === 0 ? (
              <Kosong />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={modulChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {(Object.keys(modulChart[0]) as Array<keyof BarisPivot>)
                    .filter((k) => k !== "bulan" && k !== "label")
                    .map((k, i) => (
                      <Bar
                        key={String(k)}
                        dataKey={String(k)}
                        name={String(k)}
                        stackId="a"
                        fill={`hsl(${205 + i * 40}, 65%, 52%)`}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel judul="Average time to resolve">
            {rataPerbaikan.length === 0 ? (
              <Kosong />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rataPerbaikan} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${formatDesimal(v)} hari`, "Rata-rata"]}
                  />
                  <Bar dataKey="hari" fill={WARNA.rata} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel judul="Reopened per month">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={garis} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatAngka(v), "Reopened"]} />
                <Bar dataKey="dibuka_ulang" fill={WARNA.dibukaUlang} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel judul="Reopen rate">
            {persen.every((p) => p.persen === 0) ? (
              <Kosong />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={persen} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Reopen rate"]} />
                  <Bar dataKey="persen" fill={WARNA.persen} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

/** Panel tinggi tetap 240 px supaya tidak ada grafik yang terpotong. */
function Panel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-2.5 text-sm font-bold text-ink">
        {judul}
      </h2>
      <div className="p-3" style={{ height: 240 + 24 }}>
        {children}
      </div>
    </section>
  );
}

function Kosong() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-ink-3">No data on this range.</p>
    </div>
  );
}