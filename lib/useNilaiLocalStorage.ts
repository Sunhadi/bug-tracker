"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Baca dan tulis satu nilai di localStorage tanpa memicu hydration mismatch.
 *
 * useState dengan initializer yang menyentuh localStorage akan membuat server
 * merender nilai bawaan sementara client merender nilai tersimpan, dan React
 * akan memperingatkan. useSyncExternalStore memberi snapshot bawaan di server
 * dan snapshot sebenarnya di client.
 *
 * Nilai disimpan sebagai teks; dipakai untuk preferensi tampilan saja, bukan
 * data yang perlu dienkripsi.
 */

const KUNCI = "bt_pref";

let cache: Record<string, string> = {};
let sudahDimuat = false;
const pendengar: Set<() => void> = new Set();

function muat() {
  if (sudahDimuat || typeof window === "undefined") return;
  sudahDimuat = true;
  try {
    const semua = localStorage.getItem(KUNCI);
    cache = semua ? (JSON.parse(semua) as Record<string, string>) : {};
  } catch {
    cache = {};
  }
}

function simpan() {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(cache));
  } catch {
    // Penyimpanan penuh atau ditolak; nilai tetap ada di memory.
  }
}

function subscribe(panggil: () => void): () => void {
  pendengar.add(panggil);
  return () => {
    pendengar.delete(panggil);
  };
}

export function useNilaiLocalStorage(
  kunci: string,
  bawaan: string
): [string, (nilai: string) => void] {
  const snapshotClient = useCallback(() => {
    muat();
    return cache[kunci] ?? bawaan;
  }, [kunci, bawaan]);
  const snapshotServer = useCallback(() => bawaan, [bawaan]);

  const nilai = useSyncExternalStore(subscribe, snapshotClient, snapshotServer);

  const setNilai = useCallback(
    (baru: string) => {
      muat();
      cache[kunci] = baru;
      simpan();
      for (const panggil of pendengar) panggil();
    },
    [kunci]
  );

  return [nilai, setNilai];
}
