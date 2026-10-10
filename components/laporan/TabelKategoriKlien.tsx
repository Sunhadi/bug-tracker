"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Lozenge } from "@/components/ui";
import { ChipTipe } from "./DetailItemTable";
import CatatanInline from "./CatatanInline";
import { useToast } from "@/components/ToastProvider";
import type { BarisKategori, ItemLaporan } from "@/lib/reports-bulanan";
import { formatTanggalDariKunci } from "@/lib/format";

/**
 * Tabel kategori laporan Klien. Kolom Catatan bisa diedit langsung dan
 * disimpan ke report_notes dengan key `kategori:<nama>`.
 */
export default function TabelKategoriKlien({
  bulan,
  projectId,
  kategori,
  catatan,
}: {
  bulan: string;
  projectId: number | null;
  kategori: BarisKategori[];
  catatan: Record<string, string>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
            <th scope="col" className="px-4 py-2 font-semibold">Kategori</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Jumlah</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Persentase Bug</th>
            <th scope="col" className="px-4 py-2 font-semibold">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {kategori.map((k) => (
            <tr key={k.kategori} className="border-b border-line/60 align-top last:border-0">
              <td className="px-4 py-2">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: k.color }}
                  />
                  {k.kategori}
                </span>
              </td>
              <td className="num px-3 py-2 text-right font-semibold">{k.jumlah}</td>
              <td className="num px-3 py-2 text-right text-ink-2">
                {(k.persen / 100).toLocaleString("id-ID", {
                  style: "percent",
                  maximumFractionDigits: 1,
                })}
              </td>
              <td className="min-w-[240px] px-4 py-1.5">
                <CatatanInline
                  bulan={bulan}
                  projectId={projectId}
                  section={`kategori:${k.kategori}`}
                  awal={catatan[`kategori:${k.kategori}`] ?? ""}
                  placeholder="Tambah catatan kategori"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Kartu Kesimpulan: arah tren, catatan yang bisa diedit, daftar bug yang
 * belum selesai, dan transparansi scope.
 */
export function KartuKesimpulan({
  bulan,
  projectId,
  kpi,
  totalTemuan,
  openItems,
  catatan,
}: {
  bulan: string;
  projectId: number | null;
  kpi: import("@/lib/reports-bulanan").KpiKlien;
  totalTemuan: number;
  openItems: ItemLaporan[];
  catatan: Record<string, string>;
}) {
  const p = kpi.perubahan;
  const arah = p === null || Math.abs(p) < 0.1 ? "STABIL" : p < 0 ? "MENURUN" : "NAIK";
  const tone = arah === "MENURUN" ? "ok" : arah === "NAIK" ? "danger" : "netral";
  const kalimat =
    p === null
      ? "Tidak ada data pembanding minggu ini."
      : `${arah === "MENURUN" ? "Jumlah bug menurun" : arah === "NAIK" ? "Jumlah bug naik" : "Jumlah bug stabil"} ${(Math.abs(p) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dibanding 7 hari sebelumnya.`;

  const saran = saranOtomatis(openItems, kpi.tanggalAcuan);

  return (
    <div className="divide-y divide-line">
      <div className="grid gap-3 px-4 py-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-ink-3">Arah tren</p>
          <p
            className={`mt-1 inline-block rounded-control px-2 py-0.5 text-[11px] font-bold ${
              tone === "ok"
                ? "bg-ok-soft text-ok"
                : tone === "danger"
                  ? "bg-danger/10 text-danger"
                  : "bg-surface-hover text-ink-2"
            }`}
          >
            {arah}
          </p>
          <p className="mt-1 text-xs text-ink-2">{kalimat}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-3">Open bug</p>
          <p className="num mt-1 text-sm font-semibold text-ink">
            {kpi.belumSelesai} item
          </p>
          {openItems.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {openItems.slice(0, 5).map((i) => (
                <li key={i.id} className="flex items-center gap-1.5 text-xs text-ink-2">
                  <Link
                    href={`/bugs/${i.id}`}
                    className="num shrink-0 font-semibold text-accent hover:underline"
                  >
                    {i.jiraKey ?? i.code}
                  </Link>
                  <span className="truncate">{i.title}</span>
                  <Lozenge status={i.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-ink-3">Tidak ada item yang belum selesai.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-3">Transparansi scope</p>
          <p className="num mt-1 text-sm font-semibold text-ink">
            {kpi.totalBug} bug / {totalTemuan} total temuan
          </p>
          <p className="mt-1 text-xs text-ink-2">
            Item Operational, Penambahan, Penyesuaian, dan New item dihitung
            terpisah dari bug.
          </p>
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-ink-3">Catatan</p>
        <div className="mt-1">
          <CatatanInline
            bulan={bulan}
            projectId={projectId}
            section="klien.kesimpulan"
            awal={catatan["klien.kesimpulan"] ?? ""}
            placeholder="Tulis kesimpulan periode ini..."
            blok
          />
        </div>
        {saran && (
          <TombolSaran saran={saran} bulan={bulan} projectId={projectId} />
        )}
      </div>
    </div>
  );
}

function saranOtomatis(
  openItems: ItemLaporan[],
  tanggalAcuan: string
): string | null {
  if (openItems.length === 0) return null;
  const tgl = formatTanggalDariKunci(tanggalAcuan);
  return `Masih ada ${openItems.length} item terbuka per ${tgl}.`;
}

function TombolSaran({
  saran,
  bulan,
  projectId,
}: {
  saran: string;
  bulan: string;
  projectId: number | null;
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [dipakai, setDipakai] = useState(false);

  if (dipakai) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-control bg-surface-hover px-2.5 py-2">
      <span className="text-xs text-ink-2">
        <span className="font-semibold text-ink-2">Saran:</span> {saran}
      </span>
      <Button
        size="sm"
        variant="default"
        onClick={() =>
          start(async () => {
            const res = await fetch("/api/report-notes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bulan,
                project_id: projectId,
                section: "klien.kesimpulan",
                body: saran,
              }),
            });
            if (res.ok) {
              setDipakai(true);
              toast.tampil("Saran dipakai untuk catatan");
            }
          })
        }
      >
        Pakai saran
      </Button>
    </div>
  );
}

/**
 * Record Issue: semua item apa pun tipenya, dikelompokkan per tanggal
 * temuan. Padanan bagian "Record Issue" di sheet Rekap.
 */
export function DaftarRecordIssue({ items }: { items: ItemLaporan[] }) {
  const [saring, setSaring] = useState("");
  const [action, setAction] = useState<Record<number, string>>({});
  const toast = useToast();
  const [, start] = useTransition();

  const grup = new Map<string, ItemLaporan[]>();
  for (const i of items) {
    const arr = grup.get(i.tanggal);
    if (arr) arr.push(i);
    else grup.set(i.tanggal, [i]);
  }
  const urut = [...grup.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const tampil = urut
    .map(([tanggal, isi]) => ({
      tanggal,
      isi: isi.filter((i) =>
        saring
          ? i.title.toLowerCase().includes(saring.toLowerCase())
          : true
      ),
    }))
    .filter((g) => g.isi.length > 0);

  return (
    <div>
      <div className="border-b border-line px-4 py-2.5">
        <input
          value={saring}
          onChange={(e) => setSaring(e.target.value)}
          placeholder="Cari deskripsi..."
          aria-label="Cari record issue"
          className="h-8 w-[240px] rounded-control border border-line-strong bg-surface px-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </div>
      {tampil.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-2">
          Tidak ada record issue pada bulan ini.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {tampil.map((g) => (
            <div key={g.tanggal}>
              <p className="num bg-surface-hover px-4 py-1.5 text-xs font-semibold text-ink-2">
                {formatTanggalDariKunci(g.tanggal)}
              </p>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {g.isi.map((i) => (
                    <tr key={i.id} className="border-b border-line/60 align-top last:border-0">
                      <td className="max-w-[420px] px-4 py-2">
                        <span className="num text-xs text-ink-3">
                          [{i.tanggal.slice(8, 10)}/{i.tanggal.slice(5, 7)}/{i.tanggal.slice(0, 4)}]
                        </span>{" "}
                        {i.title}
                      </td>
                      <td className="px-3 py-2">
                        <Lozenge status={i.status} />
                      </td>
                      <td className="min-w-[200px] px-3 py-1.5">
                        <input
                          defaultValue={action[i.id] ?? i.actionNote ?? ""}
                          placeholder="Action..."
                          aria-label={`Action untuk ${i.code ?? i.title}`}
                          onBlur={(e) => {
                            const nilai = e.target.value;
                            if (nilai === (i.actionNote ?? "")) return;
                            setAction((s) => ({ ...s, [i.id]: nilai }));
                            start(async () => {
                              const res = await fetch(`/api/bugs/${i.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action_note: nilai }),
                              });
                              if (!res.ok) toast.tampil("Action tidak bisa disimpan.", { tone: "warn" });
                              else toast.tampil("Action disimpan");
                            });
                          }}
                          className="h-7 w-full rounded-control border border-transparent bg-surface px-1.5 text-xs text-ink transition-colors duration-[var(--dur-fast)] hover:border-line-strong focus:border-accent focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <ChipTipe tipe={i.itemType} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}