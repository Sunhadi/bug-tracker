"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ExternalLink, Search } from "lucide-react";
import type { ItemLaporan, Kategori } from "@/lib/reports-bulanan";
import { EmptyState, Input, Lozenge } from "@/components/ui";
import { PriorityIcon } from "@/components/issue/PriorityIcon";
import { useToast } from "@/components/ToastProvider";
import { formatTanggalDariKunci } from "@/lib/format";
import { labelTipeItem, TIPE_ITEM } from "@/lib/jira";
import { slideOver } from "@/lib/motion";

type Override = { kategori: string; kategoriId: number; warnaKategori: string };

/**
 * Detail issue per kategori.
 *
 * Baris dikelompokkan per kategori, grup bisa dilipat, dan kategori bisa
 * diubah langsung dari baris. Perubahan dikirim ke PATCH /api/bugs/:id lalu
 * diterapkan lebih dulu di tampilan supaya tidak terasa lambat; kalau server
 * menolak, penampingan lokal dibuang dan angka untungnya dikembalikan.
 */
export default function DetailItemTable({
  awal,
  kategori,
}: {
  awal: ItemLaporan[];
  kategori: Kategori[];
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [cari, setCari] = useState("");
  const [lipat, setLipat] = useState<Record<string, boolean>>({});
  const [terbuka, setTerbuka] = useState<ItemLaporan | null>(null);
  const [tabel, setTabel] = useState<Record<number, Override>>({});

  const item = useMemo(
    () => awal.map((i) => (tabel[i.id] ? { ...i, ...tabel[i.id] } : i)),
    [awal, tabel]
  );

  const hasilCari = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return item;
    return item.filter((i) =>
      [i.title, i.code, i.jiraKey, i.area, i.picName, i.kategori, i.actionNote]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [item, cari]);

  const grup = useMemo(() => {
    const peta = new Map<string, ItemLaporan[]>();
    for (const i of hasilCari) {
      const arr = peta.get(i.kategori);
      if (arr) arr.push(i);
      else peta.set(i.kategori, [i]);
    }
    return [...peta.entries()]
      .map(([nama, isi]) => ({
        nama,
        isi,
        warna: isi[0]?.warnaKategori ?? "#626F86",
      }))
      .sort(
        (a, b) => b.isi.length - a.isi.length || a.nama.localeCompare(b.nama)
      );
  }, [hasilCari]);

  function gantiKategori(id: number, namaBaru: string) {
    const target = kategori.find((k) => k.name === namaBaru);
    const sebelum = tabel[id];
    const lama = awal.find((i) => i.id === id);
    if (!target || !lama) return;
    if (lama.kategori === namaBaru && !sebelum) return;

    setTabel((s) => ({ ...s, [id]: { ...lama, kategori: target.name, kategoriId: target.id, warnaKategori: target.color } }));

    start(async () => {
      const res = await fetch(`/api/bugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: target.id }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.tampil(json.error ?? "Kategori tidak bisa diubah.", {
          tone: "warn",
        });
        setTabel((s) => {
          const next = { ...s };
          delete next[id];
          return next;
        });
        return;
      }
      toast.tampil(`${lama.code ?? "Issue"} dipindahkan ke ${target.name}`, {
        aksi: {
          label: "Urungkan",
          jalankan: () => {
            setTabel((s) => {
              const next = { ...s };
              delete next[id];
              return next;
            });
            start(async () => {
              await fetch(`/api/bugs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category_id: lama.kategoriId }),
              });
            });
          },
        },
      });
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <div className="relative">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3"
          />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari judul, key, PIC, area..."
            aria-label="Cari issue"
            className="w-[260px] pl-7"
          />
        </div>
        <span className="num text-xs text-ink-2">
          {hasilCari.length} dari {item.length} item
        </span>
      </div>

      {grup.length === 0 ? (
        <EmptyState
          judul="Tidak ada issue yang cocok"
          deskripsi={
            cari ? "Ubah kata kunci pencarian." : "Belum ada item pada bulan ini."
          }
        />
      ) : (
        <div className="divide-y divide-line">
          {grup.map((g) => {
            const tutup = !!lipat[g.nama];
            return (
              <div key={g.nama}>
                <button
                  type="button"
                  onClick={() => setLipat((s) => ({ ...s, [g.nama]: !s[g.nama] }))}
                  aria-expanded={!tutup}
                  className="flex w-full items-center gap-2 bg-surface-hover px-4 py-2 text-left transition-colors duration-[var(--dur-fast)] hover:bg-bg"
                >
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`text-ink-2 transition-transform duration-[var(--dur-fast)] ${tutup ? "-rotate-90" : ""}`}
                  />
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ background: g.warna }}
                  />
                  <span className="text-sm font-semibold text-ink">{g.nama}</span>
                  <span className="num text-xs text-ink-2">{g.isi.length}</span>
                </button>

                {!tutup && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                          <th scope="col" className="px-4 py-1.5 font-semibold">Kategori</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Key</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Judul Bug</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Area / Modul</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Dibuat</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">PIC</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Priority</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Status</th>
                          <th scope="col" className="px-3 py-1.5 font-semibold">Item Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.isi.map((it) => (
                          <tr
                            key={it.id}
                            className="border-b border-line/60 transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-accent-soft/40"
                          >
                            <td className="px-4 py-2 align-top">
                              <PemilihKategori
                                item={it}
                                kategori={kategori}
                                onPilih={(nama) => gantiKategori(it.id, nama)}
                              />
                            </td>
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {it.jiraUrl ? (
                                <a
                                  href={it.jiraUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="num inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                                >
                                  {it.jiraKey ?? it.code}
                                  <ExternalLink size={11} aria-hidden="true" />
                                </a>
                              ) : (
                                <span className="num text-xs font-semibold text-ink-2">
                                  {it.code ?? "-"}
                                </span>
                              )}
                            </td>
                            <td className="max-w-[420px] px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => setTerbuka(it)}
                                className="text-left text-ink hover:text-accent"
                                title="Buka detail"
                              >
                                {it.title}
                              </button>
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-ink-2">
                              {it.area || "-"}
                            </td>
                            <td className="num px-3 py-2 align-top text-xs whitespace-nowrap text-ink-2">
                              {formatTanggalDariKunci(it.tanggal)}
                            </td>
                            <td className="px-3 py-2 align-top text-xs whitespace-nowrap text-ink-2">
                              {it.picName ?? "-"}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <PriorityIcon priority={it.priority} />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Lozenge status={it.status} />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <ChipTipe tipe={it.itemType} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PanelSamping item={terbuka} onTutup={() => setTerbuka(null)} />
    </div>
  );
}

/** Chip tipe item; warna tetap dari lib/jira.ts. */
export function ChipTipe({ tipe }: { tipe: string }) {
  const meta = TIPE_ITEM[tipe];
  return (
    <span
      className="inline-block rounded-control px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: meta?.bg ?? "#F1F2F4", color: meta?.fg ?? "#626F86" }}
    >
      {labelTipeItem(tipe)}
    </span>
  );
}

/** Popover pemilih kategori, dipakai di baris tabel detail. */
function PemilihKategori({
  item,
  kategori,
  onPilih,
}: {
  item: ItemLaporan;
  kategori: Kategori[];
  onPilih: (nama: string) => void;
}) {
  const [buka, setBuka] = useState(false);
  return (
    <Popover.Root open={buka} onOpenChange={setBuka}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex max-w-[180px] items-center gap-1.5 rounded-control border border-line-strong bg-surface px-1.5 py-0.5 text-left text-xs text-ink transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: item.warnaKategori }}
          />
          <span className="truncate">{item.kategori}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="z-50 max-h-[320px] w-[260px] overflow-y-auto rounded-panel border border-line bg-surface p-1 shadow-[var(--shadow-overlay)]"
        >
          {kategori.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                onPilih(k.name);
                setBuka(false);
              }}
              className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-xs text-ink transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: k.color }}
              />
              <span className="flex-1 truncate">{k.name}</span>
              {k.name === item.kategori && (
                <Check size={13} aria-hidden="true" className="text-accent" />
              )}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Panel samping detail item; mengikuti pola slideOver di lib/motion.ts. */
function PanelSamping({
  item,
  onTutup,
}: {
  item: ItemLaporan | null;
  onTutup: () => void;
}) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          {...slideOver}
          className="fixed inset-y-0 right-0 z-40 w-[min(420px,100vw)] overflow-y-auto border-l border-line bg-surface shadow-[var(--shadow-overlay)]"
          role="dialog"
          aria-label="Detail item"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="num text-xs font-semibold text-ink-2">
                {item.jiraKey ?? item.code ?? "Item"}
              </p>
              <h2 className="text-[15px] leading-5 font-semibold text-ink">
                {item.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onTutup}
              className="shrink-0 text-xs font-medium text-ink-2 hover:text-ink"
            >
              Tutup
            </button>
          </div>

          <dl className="divide-y divide-line">
            {(
              [
                ["Kategori", item.kategori],
                ["Area / Modul", item.area || "-"],
                ["Dibuat", formatTanggalDariKunci(item.tanggal)],
                ["PIC", item.picName ?? "-"],
                ["Fix Version", item.fixVersion ?? "-"],
                ["Item Issue", labelTipeItem(item.itemType)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-3 px-4 py-2">
                <dt className="w-28 shrink-0 text-xs text-ink-3">{k}</dt>
                <dd className="text-sm text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          {item.actionNote && (
            <div className="border-t border-line px-4 py-3">
              <p className="text-xs font-semibold text-ink-3">Action</p>
              <p className="mt-1 text-sm text-ink">{item.actionNote}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
            <ChipTipe tipe={item.itemType} />
            <Lozenge status={item.status} />
            {item.jiraUrl && (
              <a
                href={item.jiraUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs font-medium text-accent hover:underline"
              >
                Buka di Jira
              </a>
            )}
            <Link
              href={`/bugs/${item.id}`}
              className="text-xs font-medium text-accent hover:underline"
            >
              Buka issue
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}