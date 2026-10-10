"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Panel } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";
import type { Kategori } from "@/lib/reports-bulanan";

/**
 * Kelola kategori bug: nama, warna, urutan, dan status aktif.
 * Nama kategori yang sudah dipakai tidak bisa diubah karena jadi kunci
 * pada report_notes dan label di sheet acuan.
 */
export default function KelolaKategori({
  awal,
}: {
  awal: (Kategori & { jumlah: number })[];
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [daftar, setDaftar] = useState(awal);
  const [nama, setNama] = useState("");
  const [warna, setWarna] = useState("#626F86");
  const [menambah, setMenambah] = useState(false);

  function perbarui(id: number, perubahan: Partial<Kategori>) {
    setDaftar((s) => s.map((k) => (k.id === id ? { ...k, ...perubahan } : k)));
    start(async () => {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...perubahan }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.tampil(json.error ?? "Kategori tidak bisa diubah.", { tone: "warn" });
      }
    });
  }

  function tambah() {
    const bersih = nama.trim();
    if (!bersih) return;
    setMenambah(true);
    start(async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bersih, color: warna }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: Kategori;
      };
      setMenambah(false);
      if (!res.ok || !json.data) {
        toast.tampil(json.error ?? "Kategori tidak bisa ditambah.", { tone: "warn" });
        return;
      }
      setDaftar((s) => [...s, { ...json.data!, jumlah: 0 }]);
      setNama("");
      toast.tampil(`Kategori "${bersih}" ditambahkan`);
    });
  }

  return (
    <div className="space-y-3">
      <Panel title="Kategori aktif">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
              <th scope="col" className="px-4 py-2 font-semibold">Kategori Issue</th>
              <th scope="col" className="px-3 py-2 font-semibold">Warna</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Urutan</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Issue</th>
              <th scope="col" className="px-4 py-2 text-center font-semibold">Aktif</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((k) => (
              <tr key={k.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: k.color }}
                    />
                    {k.name}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="color"
                    value={k.color}
                    aria-label={`Warna ${k.name}`}
                    onChange={(e) => perbarui(k.id, { color: e.target.value })}
                    className="h-7 w-10 cursor-pointer rounded-control border border-line-strong bg-surface"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Input
                    type="number"
                    defaultValue={k.sortOrder}
                    aria-label={`Urutan ${k.name}`}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n !== k.sortOrder) {
                        perbarui(k.id, { sortOrder: n });
                      }
                    }}
                    className="num ml-auto w-16 text-right"
                  />
                </td>
                <td className="num px-3 py-2 text-right text-ink-2">
                  {"jumlah" in k ? String(k.jumlah) : "0"}
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={k.isActive}
                    aria-label={`Aktifkan ${k.name}`}
                    onChange={(e) => perbarui(k.id, { isActive: e.target.checked })}
                    className="size-4 accent-[var(--accent)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Tambah kategori">
        <div className="flex flex-wrap items-end gap-2 px-4 py-3">
          <label className="block text-xs font-semibold text-ink-2">
            Nama
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") tambah();
              }}
              placeholder="Contoh: Timestamp / Timezone"
              className="mt-1 w-[260px]"
            />
          </label>
          <label className="block text-xs font-semibold text-ink-2">
            Warna
            <input
              type="color"
              value={warna}
              onChange={(e) => setWarna(e.target.value)}
              className="mt-1 h-8 w-12 cursor-pointer rounded-control border border-line-strong bg-surface"
            />
          </label>
          <Button
            variant="primary"
            disabled={menambah || !nama.trim()}
            onClick={tambah}
          >
            <Plus size={14} />
            {menambah ? "Menyimpan..." : "Tambah"}
          </Button>
        </div>
      </Panel>

      <p className="flex items-start gap-2 text-xs text-ink-3">
        <Trash2 size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        Kategori tidak dihapus, hanya dinonaktifkan. Issue yang sudah punya
        kategori tetap menampilkan nama kategori itu di laporan.
      </p>
    </div>
  );
}