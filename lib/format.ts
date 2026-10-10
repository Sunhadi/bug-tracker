/**
 * Format tanggal dan angka untuk antarmuka.
 * Semua tanggal dan jam memakai locale id-ID dan zona Asia/Jakarta
 * supaya tidak bergeser sehari dibanding zona server.
 */

const ZONA = "Asia/Jakarta";

const fmtTanggal = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const fmtTanggalPendek = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
});

const fmtBulanTahun = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  month: "short",
  year: "2-digit",
});

const fmtBulanPenuh = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  month: "long",
  year: "numeric",
});

const fmtTanggalJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
});

function keTanggal(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "9 Okt 2026" */
export function formatTanggal(input: string | Date | null | undefined): string {
  const d = keTanggal(input);
  return d ? fmtTanggal.format(d) : "-";
}

/** "9 Okt" */
export function formatTanggalPendek(
  input: string | Date | null | undefined
): string {
  const d = keTanggal(input);
  return d ? fmtTanggalPendek.format(d) : "-";
}

/** "9 Okt 2026, 14.30" */
export function formatTanggalJam(
  input: string | Date | null | undefined
): string {
  const d = keTanggal(input);
  return d ? fmtTanggalJam.format(d) : "-";
}

export function formatJam(input: string | Date | null | undefined): string {
  const d = keTanggal(input);
  return d ? fmtJam.format(d) : "-";
}

/** "2026-10" -> "Okt 26" untuk label sumbu X. */
export function formatBulanRingkas(bulan: string): string {
  const d = new Date(`${bulan}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return bulan;
  return fmtBulanTahun.format(d);
}

/** "2026-10" -> "Oktober 2026" untuk tooltip. */
export function formatBulanPenuh(bulan: string): string {
  const d = new Date(`${bulan}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return bulan;
  return fmtBulanPenuh.format(d);
}

/** Tanggal hari ini di zona Jakarta, format YYYY-MM-DD. */
export function todayJakarta(): string {
  // Bangun dari waktu UTC lalu geser manual ke offset WIB (UTC+7) agar
  // tidak bergantung pada jam sistem.
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  return wib.toISOString().slice(0, 10);
}

/** Ubah "YYYY-MM-DD" menjadi "9 Okt 2026". */
export function formatTanggalDariKunci(kunci: string): string {
  const d = keTanggal(`${kunci}T00:00:00`);
  return d ? fmtTanggal.format(d) : kunci;
}

/**
 * "Hari ini", "3 hari lalu", atau null kalau sudah lebih dari 7 hari.
 * Dipakai di kolom tanggal daftar bug agar yang baru mudah dikenali.
 */
export function formatRelatif(
  input: string | Date | null | undefined
): string | null {
  const d = keTanggal(input);
  if (!d) return null;

  // Selisih hari dihitung berdasarkan tanggal kalender di zona Jakarta,
  // bukan selisih jam, supaya "hari ini" tidak berubah tengah malam.
  const hariIni = new Date(`${todayJakarta()}T00:00:00Z`).getTime();
  const hariBug = new Date(
    `${new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d)}T00:00:00Z`
  ).getTime();

  const selisihHari = Math.round((hariIni - hariBug) / 86400000);
  if (selisihHari < 0) return null;
  if (selisihHari === 0) return "Hari ini";
  if (selisihHari === 1) return "Kemarin";
  if (selisihHari <= 7) return `${selisihHari} hari lalu`;
  return null;
}

/** Umur dalam hari sejak tanggal, minimal 0. */
export function umurHari(input: string | Date | null | undefined): number {
  const d = keTanggal(input);
  if (!d) return 0;
  const selisihMs = Date.now() - d.getTime();
  if (selisihMs <= 0) return 0;
  return Math.floor(selisihMs / 86400000);
}

/** "3 hari" */
export function formatUmur(
  input: string | Date | null | undefined
): string {
  const hari = umurHari(input);
  if (hari === 0) return "Hari ini";
  if (hari === 1) return "1 hari";
  return `${hari} hari`;
}

/** Angka dengan pemisah ribuan, tanpa pecahan. */
export function formatAngka(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Angka desimal dengan maksimal satu angka di belakang koma. */
export function formatDesimal(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(n);
}

/** Persentase dengan satu desimal, contoh 27,6%. */
export function formatPersen(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0%";
  return `${formatDesimal(n)}%`;
}

/** Tanggal "30 Jul" untuk sumbu dan tabel harian. */
export function formatHariPendek(kunci: string): string {
  const d = new Date(`${kunci}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return kunci;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function inisial(nama: string | null | undefined): string {
  if (!nama) return "?";
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return "?";
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}