"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { useToast } from "@/components/ToastProvider";
import type { BarisScope } from "@/lib/reports-bulanan";
import { formatTanggalDariKunci } from "@/lib/format";
import { slideOver } from "@/lib/motion";

/**
 * Tabel request scope tambahan.
 *
 * Kolom persis seperti sheet "Tambahan Scope": No, Requester, Area / Modul,
 * Kebutuhan, Tujuan, Kategori, Posisi terhadap Schedule Phase 2, Catatan.
 * Teks panjang dipotong dua baris dan baris bisa diklik untuk membuka panel
 * samping berisi seluruh isi, status, dan riwayatnya.
 */

const TIPE = [
  { value: "new_requirement", label: "New Requirement" },
  { value: "enhancement", label: "Enhancement" },
];

const STATUS = ["dibahas", "disetujui", "dikerjakan", "selesai", "ditolak"];

export function labelTipe(tipe: string): string {
  return TIPE.find((t) => t.value === tipe)?.label ?? tipe;
}

export function labelStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Lozenge posisi terhadap schedule. */
export function LozengePosisi({ posisi }: { posisi: string }) {
  const luar = posisi === "luar_phase";
  return (
    <span
      className="inline-block rounded-control px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
      style={{
        background: luar ? "#FFEBE1" : "#E3FCEF",
        color: luar ? "#974F0C" : "#006644",
      }}
    >
      {luar ? "Di luar Phase 2" : "Dalam Phase 2"}
    </span>
  );
}

export function ChipTipeScope({ tipe }: { tipe: string }) {
  return (
    <span className="inline-block rounded-control bg-surface-hover px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-ink-2">
      {labelTipe(tipe)}
    </span>
  );
}

/** Teks panjang dipotong dua baris. */
function Potong({ teks, className = "" }: { teks: string; className?: string }) {
  return (
    <span
      className={`line-clamp-2 ${className}`}
      title={teks}
    >
      {teks || "-"}
    </span>
  );
}

export default function TabelScope({
  awal,
  bulan,
  projectId,
}: {
  awal: BarisScope[];
  bulan: string;
  projectId: number | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, start] = useTransition();
  const [cari, setCari] = useState("");
  const [fRequester, setFRequester] = useState("");
  const [fKategori, setFKategori] = useState("");
  const [fPosisi, setFPosisi] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [terbuka, setTerbuka] = useState<BarisScope | null>(null);
  const [dialog, setDialog] = useState(false);

  const requesterUnik = useMemo(
    () => [...new Set(awal.map((r) => r.requester))].sort(),
    [awal]
  );
  const labelUnik = useMemo(
    () => [...new Set(awal.map((r) => r.label).filter(Boolean))].sort() as string[],
    [awal]
  );

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return awal.filter((r) => {
      if (fRequester && r.requester !== fRequester) return false;
      if (fPosisi && r.phasePosition !== fPosisi) return false;
      if (fStatus && r.status !== fStatus) return false;
      if (fKategori && r.label !== fKategori) return false;
      if (!q) return true;
      return [r.request, r.requester, r.area, r.expectedOutcome, r.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [awal, cari, fRequester, fKategori, fPosisi, fStatus]);

  function ubahStatus(id: number, status: string) {
    start(async () => {
      const res = await fetch(`/api/scope-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.tampil("Status tidak bisa diubah.", { tone: "warn" });
        return;
      }
      toast.tampil(`Status diubah ke ${labelStatus(status)}`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <Input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari kebutuhan..."
          aria-label="Cari request"
          className="w-[220px]"
        />
        <Select
          aria-label="Filter requester"
          value={fRequester}
          onChange={(e) => setFRequester(e.target.value)}
          className="w-[140px]"
        >
          <option value="">Semua requester</option>
          {requesterUnik.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter kategori"
          value={fKategori}
          onChange={(e) => setFKategori(e.target.value)}
          className="w-[150px]"
        >
          <option value="">Semua kategori</option>
          {labelUnik.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Select>
        <Select
          aria-label="Filter posisi"
          value={fPosisi}
          onChange={(e) => setFPosisi(e.target.value)}
          className="w-[140px]"
        >
          <option value="">Semua posisi</option>
          <option value="luar_phase">Di luar Phase 2</option>
          <option value="dalam_phase">Dalam Phase 2</option>
        </Select>
        <Select
          aria-label="Filter status"
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="w-[130px]"
        >
          <option value="">Semua status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>{labelStatus(s)}</option>
          ))}
        </Select>
        <span className="num text-xs text-ink-2">
          {hasil.length} dari {awal.length} request
        </span>
        <Button
          size="sm"
          variant="primary"
          className="ml-auto"
          onClick={() => setDialog(true)}
        >
          <Plus size={14} />
          Tambah request
        </Button>
      </div>

      {hasil.length === 0 ? (
        <EmptyState
          judul="Tidak ada request yang cocok"
          deskripsi="Ubah filter atau tambahkan request baru."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                <th scope="col" className="px-4 py-2 font-semibold">No.</th>
                <th scope="col" className="px-3 py-2 font-semibold">Requester</th>
                <th scope="col" className="px-3 py-2 font-semibold">Area / Modul</th>
                <th scope="col" className="px-3 py-2 font-semibold">Kebutuhan / Request</th>
                <th scope="col" className="px-3 py-2 font-semibold">Tujuan / Expected Outcome</th>
                <th scope="col" className="px-3 py-2 font-semibold">Kategori</th>
                <th scope="col" className="px-3 py-2 font-semibold">Posisi terhadap Schedule Phase 2</th>
                <th scope="col" className="px-4 py-2 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => setTerbuka(r)}
                  className="cursor-pointer border-b border-line/60 transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-accent-soft/40"
                >
                  <td className="num px-4 py-2 align-top text-ink-2">{i + 1}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">{r.requester}</td>
                  <td className="px-3 py-2 align-top text-xs text-ink-2">{r.area || "-"}</td>
                  <td className="max-w-[280px] px-3 py-2 align-top">
                    <Potong teks={r.request} className="text-ink" />
                  </td>
                  <td className="max-w-[240px] px-3 py-2 align-top">
                    <Potong teks={r.expectedOutcome ?? ""} className="text-ink-2" />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {r.types.map((t) => (
                        <ChipTipeScope key={t} tipe={t} />
                      ))}
                      {r.label && (
                        <span className="inline-block rounded-control border border-line px-1.5 py-0.5 text-[11px] whitespace-nowrap text-ink-2">
                          {r.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <LozengePosisi posisi={r.phasePosition} />
                    <p className="num mt-0.5 text-[11px] text-ink-3">
                      baru dibahas {formatTanggalDariKunci(r.discussedOn)}
                    </p>
                  </td>
                  <td className="max-w-[200px] px-4 py-2 align-top">
                    <Potong teks={r.notes ?? ""} className="text-xs text-ink-2" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PanelScope
        item={terbuka}
        onTutup={() => setTerbuka(null)}
        onUbahStatus={ubahStatus}
      />
      <DialogScope
        buka={dialog}
        bulan={bulan}
        projectId={projectId}
        onTutup={() => setDialog(false)}
      />
    </div>
  );
}

/** Panel samping: seluruh isi, status, dan tautan ke issue. */
function PanelScope({
  item,
  onTutup,
  onUbahStatus,
}: {
  item: BarisScope | null;
  onTutup: () => void;
  onUbahStatus: (id: number, status: string) => void;
}) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          {...slideOver}
          className="fixed inset-y-0 right-0 z-40 w-[min(460px,100vw)] overflow-y-auto border-l border-line bg-surface shadow-[var(--shadow-overlay)]"
          role="dialog"
          aria-label="Detail request scope"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="num text-xs font-semibold text-ink-2">
                Request {item.requester} &middot; {formatTanggalDariKunci(item.discussedOn)}
              </p>
              <h2 className="text-[15px] leading-5 font-semibold text-ink">
                {item.request}
              </h2>
            </div>
            <button
              type="button"
              onClick={onTutup}
              aria-label="Tutup"
              className="shrink-0 text-ink-2 hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <dl className="divide-y divide-line">
            {(
              [
                ["Requester", item.requester],
                ["Area / Modul", item.area || "-"],
                ["Tujuan", item.expectedOutcome || "-"],
                ["Catatan", item.notes || "-"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-3 px-4 py-2">
                <dt className="w-32 shrink-0 text-xs text-ink-3">{k}</dt>
                <dd className="text-sm text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2 border-t border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-3">Posisi</span>
              <LozengePosisi posisi={item.phasePosition} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.types.map((t) => (
                <ChipTipeScope key={t} tipe={t} />
              ))}
              {item.label && (
                <span className="rounded-control border border-line px-1.5 py-0.5 text-[11px] text-ink-2">
                  {item.label}
                </span>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-ink-3">Status</p>
              <Select
                value={item.status}
                aria-label="Ubah status"
                onChange={(e) => onUbahStatus(item.id, e.target.value)}
                className="w-[180px]"
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>{labelStatus(s)}</option>
                ))}
              </Select>
            </div>
            {item.bugId ? (
              <Link
                href={`/bugs/${item.bugId}`}
                className="inline-block text-xs font-medium text-accent hover:underline"
              >
                Buka issue tertaut
              </Link>
            ) : (
              <TombolBuatIssue id={item.id} />
            )}
          </div>

          <div className="border-t border-line px-4 py-3">
            <p className="text-xs font-semibold text-ink-3">Riwayat status</p>
            <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
              {STATUS.slice(0, STATUS.indexOf(item.status) + 1).map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${s === item.status ? "bg-accent" : "bg-line-strong"}`}
                  />
                  {labelStatus(s)}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Buat issue dari request scope, lalu tautkan ke issue itu. */
function TombolBuatIssue({ id }: { id: number }) {
  const toast = useToast();
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  return (
    <Button
      size="sm"
      variant="default"
      disabled={sibuk}
      onClick={() => {
        setSibuk(true);
        void (async () => {
          try {
            const res = await fetch(`/api/scope-requests/${id}/issue`, {
              method: "POST",
            });
            const json = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            if (!res.ok) {
              toast.tampil(json.error ?? "Issue tidak bisa dibuat.", {
                tone: "warn",
              });
              return;
            }
            toast.tampil("Issue dibuat dari request");
            router.refresh();
          } finally {
            setSibuk(false);
          }
        })();
      }}
    >
      {sibuk ? "Membuat..." : "Buat issue dari request"}
    </Button>
  );
}

/** Dialog tambah request scope. */
function DialogScope({
  buka,
  bulan,
  projectId,
  onTutup,
}: {
  buka: boolean;
  bulan: string;
  projectId: number | null;
  onTutup: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [menyimpan, setMenyimpan] = useState(false);
  const [form, setForm] = useState({
    discussedOn: `${bulan}-01`,
    requester: "",
    area: "",
    request: "",
    expectedOutcome: "",
    label: "",
    notes: "",
    phasePosition: "luar_phase",
    status: "dibahas",
  });
  const [types, setTypes] = useState<string[]>(["enhancement"]);

  if (!buka) return null;

  function ubah(k: keyof typeof form, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function kirim() {
    setMenyimpan(true);
    try {
      const res = await fetch("/api/scope-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, types, projectId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.tampil(json.error ?? "Request tidak bisa disimpan.", { tone: "warn" });
        return;
      }
      toast.tampil("Request scope disimpan");
      onTutup();
      router.refresh();
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(9,30,66,0.54)] p-4"
        onClick={onTutup}
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Tambah request scope"
          className="my-8 w-full max-w-[560px] rounded-panel border border-line bg-surface"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-semibold text-ink">Tambah request scope</h2>
            <button type="button" onClick={onTutup} aria-label="Tutup" className="text-ink-2 hover:text-ink">
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-ink-2">
              Tanggal dibahas
              <Input
                type="date"
                value={form.discussedOn}
                onChange={(e) => ubah("discussedOn", e.target.value)}
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-xs font-semibold text-ink-2">
              Requester
              <Input
                value={form.requester}
                onChange={(e) => ubah("requester", e.target.value)}
                placeholder="Boleh banyak, dipisah koma"
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-xs font-semibold text-ink-2 sm:col-span-2">
              Area / Modul
              <Input
                value={form.area}
                onChange={(e) => ubah("area", e.target.value)}
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-xs font-semibold text-ink-2 sm:col-span-2">
              Kebutuhan
              <Textarea
                rows={3}
                value={form.request}
                onChange={(e) => ubah("request", e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-ink-2 sm:col-span-2">
              Tujuan / Expected Outcome
              <Textarea
                rows={2}
                value={form.expectedOutcome}
                onChange={(e) => ubah("expectedOutcome", e.target.value)}
                className="mt-1"
              />
            </label>

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-ink-2">Tipe</p>
              <div className="mt-1 flex gap-2">
                {TIPE.map((t) => {
                  const on = types.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTypes((s) =>
                          on ? s.filter((x) => x !== t.value) : [...s, t.value]
                        )
                      }
                      className={`rounded-control border px-2 py-1 text-xs font-medium transition-colors duration-[var(--dur-fast)] ${
                        on
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line-strong bg-surface text-ink-2"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block text-xs font-semibold text-ink-2">
              Label
              <Input
                value={form.label}
                onChange={(e) => ubah("label", e.target.value)}
                placeholder="Digitalisasi, Approval Flow, ..."
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-xs font-semibold text-ink-2">
              Posisi terhadap Schedule Phase 2
              <Select
                value={form.phasePosition}
                onChange={(e) => ubah("phasePosition", e.target.value)}
                className="mt-1 w-full"
              >
                <option value="luar_phase">Di luar Phase 2</option>
                <option value="dalam_phase">Dalam Phase 2</option>
              </Select>
            </label>
            <label className="block text-xs font-semibold text-ink-2 sm:col-span-2">
              Catatan
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => ubah("notes", e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-ink-2">
              Status
              <Select
                value={form.status}
                onChange={(e) => ubah("status", e.target.value)}
                className="mt-1 w-full"
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>{labelStatus(s)}</option>
                ))}
              </Select>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <Button variant="subtle" onClick={onTutup}>Batal</Button>
            <Button variant="primary" disabled={menyimpan} onClick={kirim}>
              {menyimpan ? "Menyimpan..." : "Simpan request"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}