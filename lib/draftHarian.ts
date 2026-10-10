/**
 * Penyimpanan draf laporan harian di localStorage.
 *
 * Dipisah ke modul sendiri supaya bisa dibaca lewat useSyncExternalStore.
 * Kalau draf dibaca langsung di useState, server akan merender draft kosong
 * sementara client merender draft yang tersimpan, dan itu memicu hydration
 * mismatch. useSyncExternalStore memberi snapshot kosong di server dan
 * snapshot sebenarnya di client, lalu React handledari keduanya tanpa warning.
 */

export type Draf = {
  uraian: string;
  pembelajaran: string;
  kendala: string;
};

export const DRAF_KOSONG: Draf = {
  uraian: "",
  pembelajaran: "",
  kendala: "",
};

const KUNCI = "bt_draft_harian";

let cache: Record<string, Draf> = {};
let sudahDimuat = false;
const pendengar: Array<() => void> = [];

function muat() {
  if (sudahDimuat || typeof window === "undefined") return;
  sudahDimuat = true;
  try {
    const mentah = localStorage.getItem(KUNCI);
    cache = mentah ? (JSON.parse(mentah) as Record<string, Draf>) : {};
  } catch {
    cache = {};
  }
}

function simpan() {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(cache));
  } catch {
    // Penyimpanan penuh atau ditolak browser; draf tetap ada di memory.
  }
}

/** Daftar pemanggil; kembalikan fungsi unsubscribe. */
export function subscribeDraf(panggil: () => void): () => void {
  pendengar.push(panggil);
  return () => {
    const i = pendengar.indexOf(panggil);
    if (i >= 0) pendengar.splice(i, 1);
  };
}

/** Snapshot di client. Objects from cache are stable references. */
export function snapshotDraf(tanggal: string): Draf {
  muat();
  return cache[tanggal] ?? DRAF_KOSONG;
}

/** Snapshot di server dan saat prerender: selalu kosong. */
export function snapshotDrafServer(): Draf {
  return DRAF_KOSONG;
}

export function tulisDraf(tanggal: string, baru: Draf): void {
  muat();
  cache[tanggal] = baru;
  simpan();
  for (const panggil of pendengar) panggil();
}