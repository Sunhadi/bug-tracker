/**
 * Konversi tanggal dan rentang bulan untuk laporan bulanan.
 * Semua tanggal dibaca sebagai kalender Asia/Jakarta.
 */

const ZONA = "Asia/Jakarta";

/** Ubah "YYYY-MM" jadi tanggal 1 bulan itu, sebagai string YYYY-MM-DD. */
export function awalBulan(bulan: string): string {
  return `${bulan}-01`;
}

/** Ubah "YYYY-MM" jadi tanggal 1 bulan berikutnya (batas atas eksklusif). */
export function awalBulanBerikutnya(bulan: string): string {
  const [tahun, bulanKe] = bulan.split("-").map((n) => parseInt(n, 10));
  const d = new Date(Date.UTC(tahun, bulanKe, 1));
  return d.toISOString().slice(0, 10);
}

/** Jumlah hari dalam bulan, mis. 2026-08 = 31. */
export function jumlahHariDalamBulan(bulan: string): number {
  const [tahun, bulanKe] = bulan.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(tahun, bulanKe, 0)).getUTCDate();
}

/** Daftar tanggal YYYY-MM-DD dari awal sampai akhir bulan (inklusif). */
export function semuaHariDalamBulan(bulan: string): string[] {
  const akhir = jumlahHariDalamBulan(bulan);
  const hasil: string[] = [];
  for (let d = 1; d <= akhir; d++) {
    hasil.push(`${bulan}-${String(d).padStart(2, "0")}`);
  }
  return hasil;
}

/** Geser bulan sejauh n, mis. geserBulan("2026-08", -1) = "2026-07". */
export function geserBulan(bulan: string, n: number): string {
  const [tahun, bulanKe] = bulan.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(tahun, bulanKe - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-08" -> "Agustus 2026" */
export function namaBulanPanjang(bulan: string): string {
  const [tahun, bulanKe] = bulan.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(tahun, bulanKe - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** "2026-08" -> "Agu 2026" */
export function namaBulanPendek(bulan: string): string {
  const [tahun, bulanKe] = bulan.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(tahun, bulanKe - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** 12 bulan terakhir termasuk bulan yang diberikan, paling lama lebih dulu. */
export function duaBelasBulanTerakhir(bulanSekarang: string): string[] {
  const hasil: string[] = [];
  for (let i = 11; i >= 0; i--) {
    hasil.push(geserBulan(bulanSekarang, -i));
  }
  return hasil;
}

/** Tanggal hari ini di zona Jakarta, format YYYY-MM-DD. */
export function hariIni(): string {
  const now = new Date();
  const wib = new Date(
    now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000
  );
  return wib.toISOString().slice(0, 10);
}

/** "2026-08-14" -> "14 Agu 2026" */
export function tanggalPanjang(tanggal: string): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** "2026-08-14" -> "14 Agu" */
export function tanggalPendek(tanggal: string): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Tanggal bisa datang dari Excel sebagai angka serial, bukan teks.
 * Konversi: tanggal = 1899-12-30 + jumlah hari.
 */
export function dariSerialExcel(nilai: unknown): string | null {
  const n =
    typeof nilai === "number"
      ? nilai
      : typeof nilai === "string" && /^\d+(\.\d+)?$/.test(nilai.trim())
        ? parseFloat(nilai)
        : NaN;
  if (!Number.isFinite(n)) return null;
  const ms = Math.round((n - 25569) * 86400000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Tanggal dari berbagai bentuk input Excel, selalu YYYY-MM-DD. */
export function keTanggalJakarta(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  if (nilai instanceof Date) {
    // ExcelJS membaca sel tanggal sebagai instant UTC dari nomor serinya.
    // Pengelompokan tanggal di Excel memakai bagian tanggal dari nilai itu
    // juga, jadi bagian tanggal UTC yang dipakai, bukan jam lokal. Contohnya
    // sel "31 Jul 2026 01:49" terbaca sebagai 2026-07-30T18:49Z dan Excel
    // menghitungnya masih 30 Juli; kalau dipakai tanggal lokal, baris itu
    // bergeser ke 31 Juli dan total harian tidak cocok dengan file acuan.
    const d = nilai;
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof nilai === "number") return dariSerialExcel(nilai);
  const teks = String(nilai).trim();
  if (!teks) return null;
  if (/^\d+(\.\d+)?$/.test(teks)) return dariSerialExcel(teks);
  const cocok = teks.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (cocok) {
    return `${cocok[1]}-${cocok[2].padStart(2, "0")}-${cocok[3].padStart(2, "0")}`;
  }
  const d = new Date(teks);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Tanggal acuan laporan Klien: hari terakhir yang punya data pada bulan itu.
 * Untuk bulan berjalan dipakai hari ini.
 */
export function tanggalAcuan(
  bulan: string,
  tanggalTerakhirAdaData: string | null,
  hariIniStr: string
): string {
  if (bulan === hariIniStr.slice(0, 7)) return hariIniStr;
  if (tanggalTerakhirAdaData) return tanggalTerakhirAdaData;
  return `${bulan}-${String(jumlahHariDalamBulan(bulan)).padStart(2, "0")}`;
}

export { ZONA };