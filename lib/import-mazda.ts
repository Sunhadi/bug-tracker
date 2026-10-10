/**
 * Parser workbook Rekap Bug Mazda.
 *
 * Sumber angka laporan bulanan: db/seed-data/rekap-bug-mazda.xlsx
 *
 * Sheet yang dipakai:
 * - "Daftar Bug"                     23 issue Jira lengkap dengan key, PIC, fix version
 * - "Trend Kategori Bug + Tambahan" 29 item analisis: kategori, tanggal, priority,
 *                                    status, Action, dan tipe item
 * - "Tambahan Scope Agustus 2026"   8 request scope tambahan
 *
 * Item di tabel detail dicocokkan ke Daftar Bug berdasarkan judul. Yang cocok
 * berarti issue Jira yang ikut dianalisis, yang tidak cocok berarti temuan
 * tambahan. Dari situ diperoleh jumlah dikecualikan = 23 - jumlah yang cocok.
 */

import ExcelJS from "exceljs";
import { keTanggalJakarta } from "./date.ts";
import type {
  BugItemType,
  BugSeverity,
  BugStatus,
  ScopeType,
} from "../db/schema.ts";

export interface ItemAnalisis {
  kategori: string;
  judul: string;
  area: string;
  tanggal: string;
  priority: number;
  status: BugStatus;
  actionNote: string | null;
  itemType: BugItemType;
  /** Terisi bila judulnya cocok dengan issue di Daftar Bug. */
  jiraKey: string | null;
  jiraUrl: string | null;
  picName: string | null;
  fixVersion: string | null;
  /** Dibaca dari sheet Rekap, dipakai untuk kolom Action di laporan Rekap. */
  rekapNote: string | null;
}

export interface IssueJira {
  key: string;
  judul: string;
  area: string;
  pic: string;
  priority: string;
  status: string;
  dibuat: string | null;
  diperbarui: string | null;
  selesai: string | null;
  fixVersion: string;
  url: string;
}

export interface RequestScope {
  no: number;
  requester: string;
  area: string;
  request: string;
  expectedOutcome: string | null;
  /** Contoh: "New Requirement / Enhancement" */
  kategoriTeks: string;
  /** new_requirement atau enhancement, hasil pecahan kategoriTeks. */
  tipe: ScopeType[];
  posisi: string;
  catatan: string | null;
}

export interface DataMazda {
  jira: IssueJira[];
  item: ItemAnalisis[];
  scope: RequestScope[];
  /** Jumlah issue Jira yang tidak ikut dianalisis. */
  jumlahDikecualikan: number;
}

/** Kategori awal beserta warna usulan dari dokumen bagian 8.2. */
export const KATEGORI_AWAL: { name: string; color: string }[] = [
  { name: "Validation & Error Handling", color: "#0C66E4" },
  { name: "UI / State & Navigation", color: "#6554C0" },
  { name: "Data Integrity & Consistency", color: "#1F845A" },
  { name: "Operational / Infrastructure & Hardware", color: "#E56910" },
  { name: "Business Logic & Calculation", color: "#CF9F02" },
  { name: "Security / Access & Sensitive Data", color: "#C9372C" },
  { name: "Timestamp / Timezone", color: "#22A0C8" },
];

const STATUS_MAP: Record<string, BugStatus> = {
  DONE: "selesai",
  "READY TO DEPLOY": "selesai",
  "IN REVIEW": "diperbaiki",
  "ON PROGRESS": "dikonfirmasi",
  "IN PROGRESS": "dikonfirmasi",
  OPEN: "baru",
  UNPLANNED: "baru",
  UNKNOWN: "baru",
  REOPENED: "dibuka_ulang",
};

const PRIORITY_MAP: Record<string, number> = {
  HIGHEST: 1,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  LOWEST: 3,
};

const SEVERITY_DARI_PRIORITY: Record<number, BugSeverity> = {
  1: "tinggi",
  2: "sedang",
  3: "rendah",
};

/** Kolom Item Issue kosong berarti item itu bug. */
const ITEM_TYPE_MAP: Record<string, BugItemType> = {
  bug: "bug",
  operational: "operational",
  penambahan: "penambahan",
  penyesuaian: "penyesuaian",
  "new item": "new_item",
};

function teks(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.richText) {
      return (o.richText as Array<{ text: string }>)
        .map((t) => t.text)
        .join("")
        .trim();
    }
    if (o.formula !== undefined) {
      return String(o.result ?? "").trim();
    }
    if (o.text !== undefined) return String(o.text).trim();
    if (o.hyperlink !== undefined) return String(o.text ?? o.hyperlink).trim();
  }
  return String(v).trim();
}

/** Ambil nilai sel apa pun bentuknya: formula, richtext, hyperlink, atau biasa. */
function sel(ws: ExcelJS.Worksheet, baris: number, kolom: number): string {
  return teks(ws.getCell(baris, kolom).value);
}

/** Tanggal dari sel Excel, apa pun bentuknya. */
function selTanggal(
  ws: ExcelJS.Worksheet,
  baris: number,
  kolom: number
): string | null {
  return keTanggalJakarta(ws.getCell(baris, kolom).value);
}

/** Samakan judul supaya cocok walau ada beda spasi atau tanda baca. */
function normalisasi(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export async function bacaMazda(path: string): Promise<DataMazda> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);

  // ---------------- Daftar Bug ----------------
  const sheetJira = wb.getWorksheet("Daftar Bug");
  const jira: IssueJira[] = [];
  if (sheetJira) {
    for (let r = 2; r <= sheetJira.rowCount; r++) {
      const key = sel(sheetJira, r, 2);
      if (!key) continue;
      jira.push({
        key,
        judul: sel(sheetJira, r, 3),
        area: sel(sheetJira, r, 4),
        pic: sel(sheetJira, r, 5),
        priority: sel(sheetJira, r, 6),
        status: sel(sheetJira, r, 7),
        dibuat: selTanggal(sheetJira, r, 8),
        diperbarui: selTanggal(sheetJira, r, 9),
        selesai: selTanggal(sheetJira, r, 10),
        fixVersion: sel(sheetJira, r, 11),
        url: sel(sheetJira, r, 12),
      });
    }
  }

  // ---------------- Rekap (catatan Action per tanggal) ----------------
  // Sheet Rekap tidak punya header jelas; kolom B berisi deskripsi temuan.
  const catatanRekap = new Map<string, string>();
  const sheetRekap = wb.getWorksheet("Rekap");
  if (sheetRekap) {
    for (let r = 1; r <= sheetRekap.rowCount; r++) {
      const t = sel(sheetRekap, r, 2);
      if (t) catatanRekap.set(normalisasi(t), t);
    }
  }

  // ---------------- Trend Kategori Bug + Tambahan ----------------
  const sheetItem = wb.getWorksheet("Trend Kategori Bug + Tambahan");
  const item: ItemAnalisis[] = [];
  const petaJira = new Map(jira.map((j) => [normalisasi(j.judul), j]));

  if (sheetItem) {
    // Cari baris header tabel detail: kolom A = "Kategori Issue" dan kolom D = "Dibuat".
    // Baris 4 juga kolom A-nya "Kategori Issue", tapi itu tabel ringkasan per kategori.
    let barisDetail = 0;
    for (let r = 1; r <= Math.min(sheetItem.rowCount, 80); r++) {
      if (
        sel(sheetItem, r, 1) === "Kategori Issue" &&
        sel(sheetItem, r, 4) === "Dibuat"
      ) {
        barisDetail = r + 1;
        break;
      }
    }
    if (!barisDetail) {
      throw new Error(
        "Header tabel detail tidak ditemukan di sheet Trend Kategori Bug + Tambahan"
      );
    }

    for (let r = barisDetail; r <= sheetItem.rowCount; r++) {
      const kategori = sel(sheetItem, r, 1);
      const judul = sel(sheetItem, r, 2);
      if (!kategori || !judul) continue;

      const cocok = petaJira.get(normalisasi(judul)) ?? null;
      const tipeTeks = sel(sheetItem, r, 8).toLowerCase();
      const priorityTeks = sel(sheetItem, r, 5);

      item.push({
        kategori,
        judul,
        area: sel(sheetItem, r, 3),
        tanggal: selTanggal(sheetItem, r, 4) ?? "1970-01-01",
        priority: PRIORITY_MAP[priorityTeks] ?? 2,
        status: STATUS_MAP[sel(sheetItem, r, 6)] ?? "baru",
        actionNote: sel(sheetItem, r, 7) || null,
        itemType: ITEM_TYPE_MAP[tipeTeks] ?? "bug",
        jiraKey: cocok?.key ?? null,
        jiraUrl: cocok?.url || null,
        picName: cocok?.pic || null,
        fixVersion: cocok?.fixVersion || null,
        rekapNote: catatanRekap.get(normalisasi(judul)) ?? null,
      });
    }
  }

  // ---------------- Tambahan Scope ----------------
  const sheetScope = wb.getWorksheet("Tambahan Scope Agustus 2026");
  const scope: RequestScope[] = [];
  if (sheetScope) {
    let barisDetail = 0;
    for (let r = 1; r <= Math.min(sheetScope.rowCount, 20); r++) {
      if (sel(sheetScope, r, 1) === "No." || sel(sheetScope, r, 2) === "Requester") {
        barisDetail = r + 1;
        break;
      }
    }
    for (let r = barisDetail; r <= sheetScope.rowCount; r++) {
      const requester = sel(sheetScope, r, 2);
      if (!requester) continue;
      const kategoriTeks = sel(sheetScope, r, 6);
      const tipe = kategoriTeks
        .toLowerCase()
        .split("/")
        .map((t) => t.trim())
        .filter((t) => t === "new requirement" || t === "enhancement")
        .map((t) => (t === "new requirement" ? "new_requirement" : "enhancement")) as ScopeType[];
      scope.push({
        no: parseInt(sel(sheetScope, r, 1), 10) || scope.length + 1,
        requester,
        area: sel(sheetScope, r, 3),
        request: sel(sheetScope, r, 4),
        expectedOutcome: sel(sheetScope, r, 5) || null,
        kategoriTeks,
        tipe: tipe.length ? tipe : ["enhancement"],
        posisi: sel(sheetScope, r, 7),
        catatan: sel(sheetScope, r, 8) || null,
      });
    }
  }

  const jumlahDitaisy = item.filter((i) => i.jiraKey).length;
  return {
    jira,
    item,
    scope,
    jumlahDikecualikan: Math.max(0, jira.length - jumlahDitaisy),
  };
}

export { STATUS_MAP, PRIORITY_MAP, SEVERITY_DARI_PRIORITY, ITEM_TYPE_MAP };