/** Konstanta domain bug, dipakai bersama oleh server dan client. */

export const STATUS_SEQUENCE = [
  "baru",
  "dikonfirmasi",
  "diperbaiki",
  "retest",
  "selesai",
] as const;

export type StatusSequence = (typeof STATUS_SEQUENCE)[number];

export const SEMUA_STATUS = [
  ...STATUS_SEQUENCE,
  "ditolak",
  "dibuka_ulang",
] as const;

export type Status = (typeof SEMUA_STATUS)[number];

export const STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  dikonfirmasi: "Dikonfirmasi",
  diperbaiki: "Diperbaiki",
  retest: "Retest",
  selesai: "Selesai",
  ditolak: "Ditolak",
  dibuka_ulang: "Dibuka ulang",
};

/** Status yang masih work in progress, dipakai untuk hitungan backlog. */
export const STATUS_AKTIF: Status[] = [
  "baru",
  "dikonfirmasi",
  "diperbaiki",
  "retest",
  "dibuka_ulang",
];

export const SEVERITIES = ["kritis", "tinggi", "sedang", "rendah"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABEL: Record<string, string> = {
  kritis: "Kritis",
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
};

/** Urutan Genuang: makin kecil, makin didahulukan. */
export const SEVERITY_URUT: Record<string, number> = {
  kritis: 0,
  tinggi: 1,
  sedang: 2,
  rendah: 3,
};

export const PRIORITAS_LABEL: Record<number, string> = {
  1: "Tinggi",
  2: "Sedang",
  3: "Rendah",
};

export const PRIORITAS_KODE: Record<number, string> = {
  1: "P1",
  2: "P2",
  3: "P3",
};

export const HASIL_RUN = ["pass", "fail", "blocked"] as const;
export type HasilRun = (typeof HASIL_RUN)[number];

export const HASIL_RUN_LABEL: Record<string, string> = {
  pass: "Lulus",
  fail: "Gagal",
  blocked: "Terhalang",
};

/** Nama cookie untuk project global. Bukan data sensitif, jadi dibaca client. */
export const COOKIE_PROJECT = "bt_project";