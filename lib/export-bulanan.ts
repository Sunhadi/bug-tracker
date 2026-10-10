import ExcelJS from "exceljs";
import {
  getDetailItem,
  getDikecualikan,
  getHarianKlien,
  getJumlahPerKategori,
  getKpiKlien,
  getKpiScope,
  getKategoriBugKlien,
  getProyek,
  getScope,
  getSubjudulAnalisis,
  getTrendDibuat,
  getTrendSelesai,
} from "@/lib/reports-bulanan";
import { siapkanOpsi } from "@/lib/reports-bulanan";
import { namaBulanPanjang } from "@/lib/date";
import { formatPersen } from "@/lib/format";
import { labelTipeItem } from "@/lib/jira";
import type { ItemLaporan } from "@/lib/reports-bulanan";

/**
 * Export Excel laporan bulanan.
 *
 * Sheet dibuat sama seperti file acuan:
 *   1. Ringkasan          4. Trend Kategori Bug
 *   2. Daftar Bug         5. Trend Bug Klien
 *   3. Rekap              6. Tambahan Scope {Bulan Tahun}
 *
 * Tanggal ditulis sebagai tanggal Excel sungguhan dengan format "dd mmm yyyy",
 * persen ditulis sebagai angka dengan format "0.0%", bukan teks.
 *
 * ExcelJS tidak bisa membuat chart native. Kalau klien mengirim PNG grafik
 * (?grafik=kategori,klien atau base64 dipisah koma), gambarnya disisipkan di
 * sheet yang sesuai dengan workbook.addImage.
 */

export interface OpsiExport {
  bulan: string;
  projectId: number | null;
  sertakanTambahan: boolean;
  /** Nama sheet yang punya grafik PNG, dipisah koma. */
  grafik?: string | null;
}

interface DataSheet {
  tanggal: Date | null;
  nilai: number;
}

/** Ubah "2026-08-19" jadi objek tanggal Excel (waktu lokal, tanpa zona). */
function keTanggalExcel(kunci: string): Date | null {
  const d = new Date(`${kunci}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function gayaHeader(sheet: ExcelJS.Worksheet, baris: number, kolom: number) {
  const row = sheet.getRow(baris);
  row.font = { bold: true };
  for (let i = 1; i <= kolom; i += 1) {
    const cell = row.getCell(i);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F2F4" },
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD6DBDF" } } };
  }
  row.commit?.();
}

function setLebar(sheet: ExcelJS.Worksheet, lebar: number[]) {
  lebar.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

/** Sisipkan gambar PNG dari parameter ?grafik= (base64 atau data URI). */
function sisipkanGrafik(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  namaSheet: string,
  raw: string | null | undefined
) {
  if (!raw) return;
  const gambar = workbook.addImage({
    base64: raw.includes("base64,") ? raw.split("base64,")[1] : raw,
    extension: "png",
  });
  sheet.addImage(gambar, {
    tl: { col: 0.35, row: 0.5 },
    ext: { width: 720, height: 360 },
  });
  sheet.getRow(1).height = 4;
}

export async function buatWorkbookBulanan(
  workbook: ExcelJS.Workbook,
  opsi: OpsiExport
): Promise<void> {
  const o = await siapkanOpsi(opsi.bulan, opsi.projectId, opsi.sertakanTambahan);
  const gambarAda = new Set(
    (opsi.grafik ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const [subjudul, detail, harian, kpi, kategoriBug, scope, kpiScope, tren, selesai, dikecualikan] =
    await Promise.all([
      getSubjudulAnalisis(o),
      getDetailItem(o),
      getHarianKlien(o),
      getKpiKlien(o),
      getKategoriBugKlien(o),
      getScope(o),
      getKpiScope(o),
      getTrendDibuat({ ...o, sertakanTambahan: true }),
      getTrendSelesai(o),
      getDikecualikan(o),
    ]);

  const proyek = await getProyek();
  const namaProject =
    opsi.projectId === null
      ? "Semua Project"
      : (proyek.find((p) => p.id === opsi.projectId)?.name ?? `Project ${opsi.projectId}`);

  // ================================================== 1. Ringkasan
  const ringkasan = workbook.addWorksheet("Ringkasan", {
    views: [{ showGridLines: false }],
  });
  setLebar(ringkasan, [30, 16, 16, 16, 16, 16]);
  ringkasan.addRow([`Ringkasan Bug ${namaProject} — ${namaBulanPanjang(opsi.bulan)}`]);
  ringkasan.getRow(1).font = { bold: true, size: 14 };
  ringkasan.addRow([]);

  const statusTabel = new Map<string, number>();
  for (const i of detail) {
    statusTabel.set(i.status, (statusTabel.get(i.status) ?? 0) + 1);
  }
  const selesaiBug = detail.filter((i) => i.itemType === "bug" && i.status === "selesai").length;
  const highPriority = detail.filter((i) => i.priority === 1).length;
  const belumAdaPic = detail.filter((i) => !i.picName).length;
  const siapDeploy = detail.filter((i) => i.status === "selesai").length;

  ringkasan.addRow(["Total Bug Tercatat", kpi.totalBug]);
  ringkasan.addRow(["Ready to Deploy / Done", siapDeploy]);
  ringkasan.addRow(["High Priority", highPriority]);
  ringkasan.addRow(["Belum Ada PIC", belumAdaPic]);
  ringkasan.addRow(["Selesai (hanya tipe bug)", selesaiBug]);
  ringkasan.addRow([]);
  ringkasan.addRow(["Status", "Jumlah"]);
  gayaHeader(ringkasan, ringkasan.rowCount, 2);
  for (const [s, n] of [...statusTabel.entries()].sort()) {
    ringkasan.addRow([s, n]);
  }
  ringkasan.addRow([]);
  ringkasan.addRow([
    "Analisis",
    `${subjudul.jira} issue Jira + ${subjudul.tambahan} temuan tambahan (${subjudul.total} item)`,
  ]);
  ringkasan.addRow(["Issue dikeluarkan dari analisis", subjudul.excluded]);

  // ================================================== 2. Daftar Bug
  const daftar = workbook.addWorksheet("Daftar Bug", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  setLebar(daftar, [6, 12, 52, 24, 18, 10, 14, 14, 14, 14, 14, 30]);
  daftar.addRow([
    "No",
    "Key",
    "Judul Bug",
    "Area / Modul",
    "PIC",
    "Priority",
    "Status",
    "Dibuat",
    "Terakhir Diperbarui",
    "Selesai",
    "Fix Version",
    "Link Jira",
  ]);
  gayaHeader(daftar, 1, 12);

  const detailUrut = [...detail].sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal)
  );
  detailUrut.forEach((i, idx) => {
    const r = daftar.addRow([
      idx + 1,
      i.jiraKey ?? i.code ?? "",
      i.title,
      i.area,
      i.picName ?? "",
      i.priority,
      i.status,
      keTanggalExcel(i.tanggal),
      null,
      null,
      i.fixVersion ?? "",
      i.jiraUrl ?? "",
    ]);
    r.getCell(8).numFmt = "dd mmm yyyy";
  });
  daftar.getColumn(8).numFmt = "dd mmm yyyy";
  if (gambarAda.has("kategori")) sisipkanGrafik(workbook, daftar, "Daftar Bug", opsi.grafik);

  // ================================================== 3. Rekap
  const rekap = workbook.addWorksheet("Rekap", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  setLebar(rekap, [14, 60, 16, 60, 16]);
  rekap.addRow(["Tanggal Temuan", "Deskripsi", "Status", "Action", "Item Issue"]);
  gayaHeader(rekap, 1, 5);
  const urutTanggal = [...new Set(detail.map((i) => i.tanggal))].sort();
  for (const t of urutTanggal) {
    for (const i of detail.filter((x) => x.tanggal === t)) {
      rekap.addRow([
        keTanggalExcel(t),
        `[${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}] ${i.title}`,
        i.status,
        i.actionNote ?? "",
        labelTipeItem(i.itemType),
      ]);
    }
  }
  rekap.getColumn(1).numFmt = "dd mmm yyyy";

  // ================================================== 4. Trend Kategori Bug
  const trenKategori = workbook.addWorksheet("Trend Kategori Bug", {
    views: [{ showGridLines: false }],
  });
  setLebar(trenKategori, [34, 12, 14]);
  trenKategori.addRow([`Analisis Trend Bug ${namaProject}`]);
  trenKategori.getRow(1).font = { bold: true, size: 13 };
  trenKategori.addRow([
    `Analisis ${subjudul.jira} issue Jira + ${subjudul.tambahan} temuan tambahan (${subjudul.total} item) | ${subjudul.excluded} issue dikeluarkan dari analisis`,
  ]);
  trenKategori.addRow([]);
  trenKategori.addRow(["Kategori Issue", "Jumlah", "Persentase"]);
  gayaHeader(trenKategori, trenKategori.rowCount, 3);

  const perKategori = await getJumlahPerKategori({ ...o, sertakanTambahan: true });
  for (const k of perKategori) {
    const r = trenKategori.addRow([k.kategori, k.jumlah, k.persen / 100]);
    r.getCell(3).numFmt = "0.0%";
  }
  const totalKategori = perKategori.reduce((s, k) => s + k.jumlah, 0);
  const barisTotal = trenKategori.addRow(["TOTAL", totalKategori, 1]);
  barisTotal.getCell(3).numFmt = "0.0%";
  barisTotal.font = { bold: true };

  trenKategori.addRow([]);
  trenKategori.addRow(["Trend per Tanggal Dibuat"]);
  trenKategori.getRow(trenKategori.rowCount).font = { bold: true };
  const kunciKategori = perKategori.map((k) => k.kategori);
  trenKategori.addRow(["Tanggal", "Total Bug", ...kunciKategori]);
  gayaHeader(trenKategori, trenKategori.rowCount, kunciKategori.length + 2);
  for (const t of tren) {
    const r = trenKategori.addRow([
      keTanggalExcel(t.tanggal),
      t.total,
      ...kunciKategori.map((k) => t.perKategori[k] ?? 0),
    ]);
    r.getCell(1).numFmt = "dd mmm yyyy";
  }
  trenKategori.addRow([]);
  trenKategori.addRow(["Trend Penyelesaian per Tanggal Selesai"]);
  trenKategori.getRow(trenKategori.rowCount).font = { bold: true };
  trenKategori.addRow(["Tanggal Selesai", "Total Selesai", "Kumulatif Selesai"]);
  gayaHeader(trenKategori, trenKategori.rowCount, 3);
  for (const s of selesai) {
    const r = trenKategori.addRow([
      keTanggalExcel(s.tanggal),
      s.selesai,
      s.kumulatif,
    ]);
    r.getCell(1).numFmt = "dd mmm yyyy";
  }

  if (dikecualikan.length > 0) {
    trenKategori.addRow([]);
    trenKategori.addRow([
      `Dikecualikan dari analisis (${dikecualikan.length} issue)`,
    ]);
    trenKategori.getRow(trenKategori.rowCount).font = { bold: true };
    trenKategori.addRow(["Key", "Judul Bug", "Dibuat", "Alasan dikeluarkan"]);
    gayaHeader(trenKategori, trenKategori.rowCount, 4);
    for (const d of dikecualikan) {
      const r = trenKategori.addRow([
        d.jiraKey ?? d.code ?? "",
        d.title,
        keTanggalExcel(d.tanggal),
        d.excludeReason ?? "",
      ]);
      r.getCell(3).numFmt = "dd mmm yyyy";
    }
  }

  // ================================================== 5. Trend Bug Klien
  const trenKlien = workbook.addWorksheet("Trend Bug Klien", {
    views: [{ showGridLines: false }],
  });
  setLebar(trenKlien, [26, 14, 46]);
  trenKlien.addRow([`Trend Bug ${namaProject} — Client Transparency Dashboard`]);
  trenKlien.getRow(1).font = { bold: true, size: 13 };
  trenKlien.addRow([
    "Memantau apakah jumlah bug baru cenderung naik atau turun. Item Operational, Penambahan, Penyesuaian, dan New item ditampilkan terpisah dari perhitungan bug.",
  ]);
  trenKlien.addRow([]);
  trenKlien.addRow(["KPI", "Nilai", "Keterangan"]);
  gayaHeader(trenKlien, trenKlien.rowCount, 3);
  trenKlien.addRow(["Total Bug Tercatat", kpi.totalBug, "Item dengan tipe bug pada periode ini"]);
  trenKlien.addRow(["Bug 7 Hari Terakhir", kpi.bug7Terakhir, kpi.rentangTerakhir]);
  trenKlien.addRow(["Bug 7 Hari Sebelumnya", kpi.bug7Sebelumnya, kpi.rentangSebelumnya]);
  const perubahanPersen = kpi.perubahan === null ? null : kpi.perubahan;
  const rPerubahan = trenKlien.addRow([
    "Perubahan Mingguan",
    perubahanPersen,
    perubahanPersen === null
      ? "Tidak ada pembanding"
      : `${perubahanPersen < 0 ? "Turun" : "Naik"} ${formatPersen(Math.abs(perubahanPersen) * 100)} dibanding 7 hari sebelumnya`,
  ]);
  rPerubahan.getCell(2).numFmt = "0.0%";
  trenKlien.addRow(["Bug Belum Selesai", kpi.belumSelesai, `${kpi.belumSelesai} masih On Progress`]);
  const rRate = trenKlien.addRow([
    "Resolution Rate",
    kpi.resolutionRate,
    `${kpi.selesai} dari ${kpi.totalBug} bug sudah selesai`,
  ]);
  rRate.getCell(2).numFmt = "0.0%";

  trenKlien.addRow([]);
  trenKlien.addRow(["Tanggal", "Bug Baru", "Temuan Non-Bug", "Total Temuan", "7-Day Avg Bug", "Arah Harian"]);
  gayaHeader(trenKlien, trenKlien.rowCount, 6);
  for (const h of harian) {
    const r = trenKlien.addRow([
      keTanggalExcel(h.tanggal),
      h.bugBaru,
      h.nonBug,
      h.total,
      h.avg7,
      h.arah === "baseline" ? "Baseline" : h.arah === "naik" ? "Naik" : h.arah === "turun" ? "Turun" : "Stabil",
    ]);
    r.getCell(1).numFmt = "dd mmm yyyy";
  }

  trenKlien.addRow([]);
  trenKlien.addRow(["Kategori", "Jumlah", "Persentase Bug"]);
  gayaHeader(trenKlien, trenKlien.rowCount, 3);
  for (const k of kategoriBug) {
    const r = trenKlien.addRow([k.kategori, k.jumlah, k.persen / 100]);
    r.getCell(3).numFmt = "0.0%";
  }
  if (gambarAda.has("klien")) sisipkanGrafik(workbook, trenKlien, "Trend Bug Klien", opsi.grafik);

  // ================================================== 6. Tambahan Scope
  const namaSheetScope = `Tambahan Scope ${namaBulanPanjang(opsi.bulan)}`.slice(0, 31);
  const sheetScope = workbook.addWorksheet(namaSheetScope, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  setLebar(sheetScope, [6, 22, 24, 50, 40, 26, 24, 40]);
  sheetScope.addRow([
    "No.",
    "Requester",
    "Area / Modul",
    "Kebutuhan / Request",
    "Tujuan / Expected Outcome",
    "Kategori",
    "Posisi terhadap Schedule Phase 2",
    "Catatan",
  ]);
  gayaHeader(sheetScope, 1, 8);
  scope.forEach((s, i) => {
    sheetScope.addRow([
      i + 1,
      s.requester,
      s.area,
      s.request,
      s.expectedOutcome ?? "",
      [...s.types, s.label].filter(Boolean).join(" / "),
      s.phasePosition === "luar_phase" ? "Di luar Phase 2" : "Dalam Phase 2",
      s.notes ?? "",
    ]);
  });
  sheetScope.addRow([]);
  sheetScope.addRow([
    "Total request",
    kpiScope.total,
    `Di luar Schedule Phase 2: ${kpiScope.luarPhase} | Requester: ${kpiScope.requester} | Disetujui: ${kpiScope.disetujui}`,
  ]);
}

/** Baris data siap dipakai ulang kalau butuh tabel tambahan. */
export type { ItemLaporan, DataSheet };