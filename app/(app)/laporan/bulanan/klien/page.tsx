import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Panel } from "@/components/ui";
import {
  getCatatan,
  getDetailItem,
  getHarianKlien,
  getKategoriBugKlien,
  getKpiKlien,
  getProyek,
  getSubjudulAnalisis,
} from "@/lib/reports-bulanan";
import {
  bacaOpsiLengkap,
  bacaProjectId,
  type SearchParams,
} from "@/lib/params-bulanan";
import { COOKIE_PROJECT } from "@/lib/constants";
import { namaBulanPanjang } from "@/lib/date";
import KpiGrid from "@/components/laporan/KpiGrid";
import TabelHarian from "@/components/laporan/TabelHarian";
import TabelKategoriKlien, {
  KartuKesimpulan,
  DaftarRecordIssue,
} from "@/components/laporan/TabelKategoriKlien";
import { GrafikBugHarian, GrafikBugVsNonBug } from "@/components/laporan/GrafikKlien";
import BagianAtas from "../BagianAtas";

export const metadata: Metadata = { title: "Trend Bug Klien" };

/** Section catatan yang dipakai tab ini. */
const SECTIONS = [
  "klien.kesimpulan",
  ...Array.from({ length: 20 }, (_, i) => `kategori:${i}`),
];

/**
 * Tab 2 laporan bulanan: Client Transparency Dashboard.
 * Halaman paling dibaca klien, jadi urutan danjaraknya dibuat rapat.
 */
export default async function LaporanKlienPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const store = await cookies();
  const dariCookie = parseInt(store.get(COOKIE_PROJECT)?.value ?? "", 10);
  const spLengkap: SearchParams = {
    ...sp,
    project_id:
      sp.project_id ??
      (Number.isFinite(dariCookie) ? String(dariCookie) : undefined),
  };

  const opsi = await bacaOpsiLengkap(spLengkap);
  const projectId = bacaProjectId(spLengkap);

  const perTanggal =
    typeof sp.per_tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.per_tanggal)
      ? sp.per_tanggal
      : undefined;

  const [proyek, kpi, harian, kategori, subjudul, semuaItem] = await Promise.all([
    getProyek(),
    getKpiKlien(opsi, perTanggal),
    getHarianKlien(opsi),
    getKategoriBugKlien(opsi),
    getSubjudulAnalisis(opsi),
    getDetailItem({ ...opsi, sertakanTambahan: true }),
  ]);

  // Catatan per kategori diambil terpisah supaya daftar section-nya pasti
  // mengikuti kategori yang benar-benar tampil.
  const sectionsCatatan = kategori.map((k) => `kategori:${k.kategori}`);
  const catatan = await getCatatan(
    opsi.bulan,
    projectId,
    sectionsCatatan.length ? sectionsCatatan : SECTIONS
  );

  const namaProject =
    proyek.find((p) => p.id === projectId)?.name ?? "Semua Project";

  // Item yang masih dikerjakan: status sudah masuk pengerjaan.
  const openItems = semuaItem
    .filter((i) => i.status === "dikonfirmasi" || i.status === "diperbaiki")
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const totalTemuan = semuaItem.length;

  return (
    <div className="cetak-laporan space-y-3">
      <BagianAtas
        judul={`Trend Bug ${namaProject} — Client Transparency Dashboard`}
        subjudul="Memantau apakah jumlah bug baru cenderung naik atau turun. Item Operational, Penambahan, Penyesuaian, dan New item ditampilkan terpisah dari perhitungan bug."
        bulan={opsi.bulan}
        projectId={projectId}
        proyek={proyek}
        tab="klien"
      />

      <KpiGrid kpi={kpi} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Trend Bug Baru Harian" bodyClassName="p-3">
          <GrafikBugHarian harian={harian} />
        </Panel>
        <Panel title="Bug vs Temuan Non-Bug per Hari" bodyClassName="p-3">
          <GrafikBugVsNonBug harian={harian} />
        </Panel>
      </div>

      <Panel
        title="Rincian Harian"
        bodyClassName="overflow-x-auto"
        className="break-inside-avoid"
      >
        <TabelHarian harian={harian} />
      </Panel>

      <Panel title="Kategori" className="break-inside-avoid">
        <TabelKategoriKlien
          bulan={opsi.bulan}
          projectId={projectId}
          kategori={kategori}
          catatan={catatan}
        />
      </Panel>

      <Panel title="Kesimpulan" className="break-inside-avoid">
        <KartuKesimpulan
          bulan={opsi.bulan}
          projectId={projectId}
          kpi={kpi}
          totalTemuan={totalTemuan}
          openItems={openItems}
          catatan={catatan}
        />
      </Panel>

      <Panel
        title={`Record Issue — ${namaBulanPanjang(opsi.bulan)}`}
        actions={
          <span className="num text-xs text-ink-2">
            {subjudul.total} item, {subjudul.excluded} dikeluarkan
          </span>
        }
      >
        <DaftarRecordIssue items={semuaItem} />
      </Panel>
    </div>
  );
}