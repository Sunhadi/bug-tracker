"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";

/**
 * Catatan yang bisa diedit langsung di laporan.
 * Disimpan lewat PUT /api/report-notes dengan key `bulan` + `project_id` + `section`.
 */
export default function CatatanInline({
  bulan,
  projectId,
  section,
  awal,
  placeholder = "Klik untuk menulis catatan...",
  blok = false,
}: {
  bulan: string;
  projectId: number | null;
  section: string;
  awal: string;
  placeholder?: string;
  blok?: boolean;
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [teks, setTeks] = useState(awal);
  const [draf, setDraf] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function simpan() {
    const nilai = draf ?? teks;
    setMenyimpan(true);
    try {
      const res = await fetch("/api/report-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulan, project_id: projectId, section, body: nilai }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.tampil(json.error ?? "Catatan tidak bisa disimpan.", { tone: "warn" });
        return;
      }
      setTeks(nilai);
      setDraf(null);
      toast.tampil("Catatan disimpan");
    } catch {
      toast.tampil("Catatan tidak bisa disimpan.", { tone: "warn" });
    } finally {
      setMenyimpan(false);
    }
  }

  if (draf === null) {
    return (
      <button
        type="button"
        onClick={() => setDraf(teks)}
        className={`w-full rounded-control px-1.5 py-0.5 text-left text-xs text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink ${
          blok ? "" : "min-h-[26px]"
        }`}
      >
        {teks || (
          <span className="text-ink-3 italic">{placeholder}</span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        autoFocus
        rows={blok ? 4 : 2}
        value={draf}
        placeholder={placeholder}
        onChange={(e) => setDraf(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setDraf(null);
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            start(() => void simpan());
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={menyimpan}
          onClick={() => start(() => void simpan())}
        >
          {menyimpan ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button size="sm" variant="subtle" onClick={() => setDraf(null)}>
          Batal
        </Button>
        <span className="text-[11px] text-ink-3">Ctrl+Enter untuk menyimpan</span>
      </div>
    </div>
  );
}