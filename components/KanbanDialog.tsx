"use client";

import { useEffect, useRef, useState } from "react";
import { URUTAN_BOARD, namaStatus, warnaStatus } from "@/lib/jira";

const OPSI_STATUS = URUTAN_BOARD.map((value) => ({ value, label: namaStatus(value) }));

/**
 * Dialog kecil untuk meminta catatan sebelum status terminal,
 * karena perubahan status tercatat di riwayat.
 */
export function DialogCatatan({
  terbuka,
  judul,
  deskripsi,
  onBatal,
  onSimpan,
}: {
  terbuka: boolean;
  judul: string;
  deskripsi?: string;
  onBatal: () => void;
  onSimpan: (catatan: string) => void;
}) {
  // Isi komponen dalam hanya dipasang saat terbuka, jadi catatan selalu
  // mulai kosong tanpa mereset state dari efek.
  if (!terbuka) return null;
  return <IsiDialog judul={judul} deskripsi={deskripsi} onBatal={onBatal} onSimpan={onSimpan} />;
}

function IsiDialog({
  judul,
  deskripsi,
  onBatal,
  onSimpan,
}: {
  judul: string;
  deskripsi?: string;
  onBatal: () => void;
  onSimpan: (catatan: string) => void;
}) {
  const [catatan, setCatatan] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onBatal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBatal]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBatal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className="pop w-full max-w-[440px] rounded-panel bg-surface p-4"
      >
        <h2 className="text-base leading-6 font-bold text-ink">{judul}</h2>
        {deskripsi && <p className="mt-1 text-sm text-ink-2">{deskripsi}</p>}

        <label
          htmlFor="catatan-dialog"
          className="mt-3 block text-[11px] font-bold tracking-wide text-ink-2 uppercase"
        >
          Comment (opsional)
        </label>
        <textarea
          id="catatan-dialog"
          ref={ref}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={3}
          placeholder="Contoh: sudah diuji ulang oleh QA"
          className="mt-1 w-full rounded-control border border-line-strong bg-surface px-2 py-1.5 text-sm leading-5 text-ink placeholder:text-ink-3 focus:border-accent"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onBatal}
            className="btn h-8 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSimpan(catatan.trim())}
            className="btn h-8 rounded-control border border-transparent bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

/** Menu "Move to..." untuk keyboard dan layar sentuh. */
export function MenuPindahStatus({
  terbuka,
  posisi,
  statusSekarang,
  onPilih,
  onTutup,
}: {
  terbuka: boolean;
  posisi: { atas: number; kiri: number };
  statusSekarang: string;
  onPilih: (status: string) => void;
  onTutup: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terbuka) return;
    ref.current?.querySelector("button")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onTutup();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [terbuka, onTutup]);

  if (!terbuka) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onTutup} aria-hidden="true" />
      <div
        ref={ref}
        role="menu"
        aria-label="Move issue"
        style={{ top: posisi.atas, left: posisi.kiri }}
        className="pop fixed z-50 min-w-[184px] rounded-panel bg-surface py-1"
      >
        <p className="px-3 py-1 text-[11px] font-bold tracking-wide text-ink-3 uppercase">
          Move to
        </p>
        {OPSI_STATUS.map((s) => (
          <button
            key={s.value}
            type="button"
            role="menuitem"
            disabled={s.value === statusSekarang}
            onClick={() => onPilih(s.value)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink transition-colors duration-[120ms] hover:bg-bg disabled:text-ink-3 disabled:hover:bg-transparent"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ background: warnaStatus(s.value) }}
            />
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}