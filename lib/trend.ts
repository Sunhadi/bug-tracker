/**
 * Tipe dan helper murni untuk laporan trend.
 * File ini TIDAK boleh mengimpor koneksi database supaya aman dipakai
 * dari komponen client (chart Recharts).
 */

export interface TrendBulanRow {
  bulan: string;
  ditemukan: number;
  selesai: number;
}

export interface BacklogRow {
  bulan: string;
  backlog: number;
}

export interface SeverityRow {
  bulan: string;
  severity: string;
  jumlah: number;
}

export interface ModulRow {
  bulan: string;
  modul: string;
  jumlah: number;
}

export interface RataPerbaikanRow {
  bulan: string;
  rata_hari: number;
}

export interface DibukaUlangRow {
  bulan: string;
  dibuka_ulang: number;
}

export interface TrendResult {
  ditemukanVsSelesai: TrendBulanRow[];
  backlog: BacklogRow[];
  perSeverity: SeverityRow[];
  perModul: ModulRow[];
  rataPerbaikan: RataPerbaikanRow[];
  dibukaUlang: DibukaUlangRow[];
}

/** Baris chart stacked: kunci bulan + satu kunci per nilai kategori. */
export type BarisPivot = Record<string, string | number>;

/**
 * Ubah baris { bulan, kategori, jumlah } menjadi satu baris per bulan,
 * dengan kolom per kategori. Baris yang tidak ada diisi 0 supaya chart
 * tidak pernah menampilkan NaN atau undefined.
 */
export function pivotBulanan<T extends { bulan: string; jumlah: number }>(
  rows: T[],
  ambilKategori: (row: T) => string
): BarisPivot[] {
  if (rows.length === 0) return [];

  const bulanSet = new Set<string>();
  const kategoriSet = new Set<string>();
  for (const row of rows) {
    bulanSet.add(row.bulan);
    kategoriSet.add(ambilKategori(row));
  }

  return Array.from(bulanSet)
    .sort()
    .map((bulan) => {
      const out: BarisPivot = { bulan };
      for (const kategori of kategoriSet) {
        const found = rows.find(
          (r) => r.bulan === bulan && ambilKategori(r) === kategori
        );
        out[kategori] = found?.jumlah ?? 0;
      }
      return out;
    });
}

/** Persentase bug dibuka ulang = dibuka_ulang / selesai pada bulan yang sama. */
export function hitungPersenDibukaUlang(trend: TrendResult): {
  bulan: string;
  persen: number;
}[] {
  return trend.ditemukanVsSelesai.map((row) => {
    const reopen =
      trend.dibukaUlang.find((d) => d.bulan === row.bulan)?.dibuka_ulang ?? 0;
    return {
      bulan: row.bulan,
      persen: row.selesai > 0 ? Math.round((reopen / row.selesai) * 100) : 0,
    };
  });
}