/**
 * Lapisan nama Jira.
 *
 * Isi database tetap bahasa Indonesia (bug-tracker-plan.md tidak diubah),
 * hanya tampilan yang memakai istilah Jira. Peta di bawah adalah satu
 *-satunya tempat penerjemahan status, jadi tidak ada nama yang menumpang
 * di beberapa file.
 */

import type { BugStatus, BugSeverity } from "@/db/schema";

/**
 * Lozenge status. Huruf kapital, tebal, 11 px, radius 3 px.
 * Nilai = status di database. Sesuai bagian 3.2 dokumen redesign.
 */
export const STATUS_JIRA = {
  baru: {
    label: "To Do",
    kapital: "TO DO",
    bg: "#DCDFE4",
    fg: "#44546F",
    rail: "#97A0AF",
  },
  dikonfirmasi: {
    label: "In Progress",
    kapital: "IN PROGRESS",
    bg: "#CCE0FF",
    fg: "#0055CC",
    rail: "#0C66E4",
  },
  diperbaiki: {
    label: "In Review",
    kapital: "IN REVIEW",
    bg: "#DFD8FD",
    fg: "#5E4DB2",
    rail: "#6554C0",
  },
  retest: {
    label: "In Testing",
    kapital: "IN TESTING",
    bg: "#C6EDFB",
    fg: "#206A83",
    rail: "#00B8D9",
  },
  selesai: {
    label: "Done",
    kapital: "DONE",
    bg: "#BAF3DB",
    fg: "#216E4E",
    rail: "#1F845A",
  },
  ditolak: {
    label: "Won't Do",
    kapital: "WON'T DO",
    bg: "#F1F2F4",
    fg: "#626F86",
    rail: "#97A0AF",
  },
  dibuka_ulang: {
    label: "Reopened",
    kapital: "REOPENED",
    bg: "#FEDEC8",
    fg: "#A54800",
    rail: "#E56910",
  },
} as const satisfies Record<
  string,
  { label: string; kapital: string; bg: string; fg: string; rail: string }
>;

/** Urutan kolom di board, sama seperti urutan di mana. */
export const URUTAN_BOARD: BugStatus[] = [
  "baru",
  "dikonfirmasi",
  "diperbaiki",
  "retest",
  "selesai",
  "ditolak",
  "dibuka_ulang",
];

/** Lima tahap utama, dipakai strip siklus. */
export const TAHAP_SIKLUS = ["baru", "dikonfirmasi", "diperbaiki", "retest", "selesai"] as const;

export function namaStatus(status: string): string {
  return STATUS_JIRA[status as BugStatus]?.label ?? status;
}

/** Warna rel pada kolom Board dan baris status bertumpuk. */
export function warnaStatus(status: string): string {
  return STATUS_JIRA[status as BugStatus]?.rail ?? "#97A0AF";
}

/** Status yang masih dikerjakan, dipakai backlog dan ringkasan. */
export const STATUS_AKTIF_JIRA: BugStatus[] = [
  "baru",
  "dikonfirmasi",
  "diperbaiki",
  "retest",
  "dibuka_ulang",
];

export const IS_TERAKHIR = (status: string) =>
  status === "selesai" || status === "ditolak";

// ---------------------------------------------------------------- prioritas

/** Jira punya Highest..Lowest; aplikasi ini memakai tiga tingkat. */
export const PRIORITAS_JIRA: Record<number, { label: string; kode: string; warna: string }> = {
  1: { label: "High", kode: "P1", warna: "#DE350B" },
  2: { label: "Medium", kode: "P2", warna: "#6554C0" },
  3: { label: "Low", kode: "P3", warna: "#0065FF" },
};

export function namaPrioritas(n: number): string {
  return PRIORITAS_JIRA[n]?.label ?? `P${n}`;
}

/**
 * Saran priority dari severity. Severity mengukur dampak teknis, priority
 * mengukur urgensi perbaikan, jadi keduanya tidak sama.
 */
export function priorityDariSeverity(severity: string): number {
  switch (severity) {
    case "kritis":
    case "tinggi":
      return 1;
    case "sedang":
      return 2;
    default:
      return 3;
  }
}

// ---------------------------------------------------------------- severity

/** Severity bukan istilah Jira, jadi tetap pakai bahasa sendiri. */
export const SEVERITY_JIRA: Record<
  string,
  { label: string; rail: string; fg: string; bg: string; hex: string }
> = {
  kritis: {
    label: "Kritis",
    rail: "bg-sev-kritis",
    fg: "text-sev-kritis-fg",
    bg: "bg-sev-kritis-bg",
    hex: "#de350b",
  },
  tinggi: {
    label: "Tinggi",
    rail: "bg-sev-tinggi",
    fg: "text-sev-tinggi-fg",
    bg: "bg-sev-tinggi-bg",
    hex: "#ff8b00",
  },
  sedang: {
    label: "Sedang",
    rail: "bg-sev-sedang",
    fg: "text-sev-sedang-fg",
    bg: "bg-sev-sedang-bg",
    hex: "#6554c0",
  },
  rendah: {
    label: "Rendah",
    rail: "bg-sev-rendah",
    fg: "text-sev-rendah-fg",
    bg: "bg-sev-rendah-bg",
    hex: "#97a0af",
  },
};

export function labelSeverity(severity: BugSeverity | string): string {
  return SEVERITY_JIRA[severity]?.label ?? severity;
}

// ---------------------------------------------------------------- tipe item

/**
 * Tipe item laporan bulanan. Hanya "Bug" yang dihitung sebagai bug;
 * sisanya dikumpulkan sebagai "Temuan Non-Bug".
 */
export const TIPE_ITEM: Record<string, { label: string; fg: string; bg: string }> = {
  bug: { label: "Bug", fg: "#0055CC", bg: "#DEEBFF" },
  operational: { label: "Operational", fg: "#974F0C", bg: "#FFEBE1" },
  penambahan: { label: "Penambahan", fg: "#006644", bg: "#E3FCEF" },
  penyesuaian: { label: "Penyesuaian", fg: "#403294", bg: "#EAE6FF" },
  new_item: { label: "New item", fg: "#006644", bg: "#E3FCEF" },
};

export function labelTipeItem(tipe: string): string {
  return TIPE_ITEM[tipe]?.label ?? tipe;
}

// ---------------------------------------------------------------- istilah lain

/** Istilah domain memakai nama Jira. */
export const ISTILAH = {
  bug: "issue",
  bugPlural: "issues",
  bugCap: "Issue",
  bugCapPlural: "Issues",
  papan: "Board",
  modul: "Component",
  modulPlural: "Components",
  modulCap: "Component",
  modulCapPlural: "Components",
} as const;

// ---------------------------------------------------------------- navigasi

export interface ItemNav {
  href: string;
  label: string;
}

export interface GrupNav {
  judul: string;
  item: ItemNav[];
}

export const NAVIGASI: GrupNav[] = [
  {
    judul: "Work",
    item: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/bugs", label: ISTILAH.bugCapPlural },
      { href: "/bugs/board", label: ISTILAH.papan },
    ],
  },
  {
    judul: "Test",
    item: [{ href: "/test-cases", label: "Test cases" }],
  },
  {
    judul: "Reports",
    item: [
      { href: "/laporan/trend", label: "Trend" },
      { href: "/laporan/harian", label: "Daily report" },
    ],
  },
];

// ---------------------------------------------------------------- hasil test

export const HASIL_RUN_JIRA: Record<string, { label: string; fg: string; bg: string }> = {
  pass: { label: "Pass", fg: "text-ok", bg: "bg-ok-soft" },
  fail: { label: "Fail", fg: "text-warn", bg: "bg-warn-soft" },
  blocked: { label: "Blocked", fg: "text-sev-sedang-fg", bg: "bg-sev-sedang-bg" },
};