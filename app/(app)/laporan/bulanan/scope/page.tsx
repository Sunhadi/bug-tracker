import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Panel, StatStrip } from "@/components/ui";
import { getKpiScope, getProyek, getScope } from "@/lib/reports-bulanan";
import { bacaOpsiLengkap, type SearchParams } from "@/lib/params-bulanan";
import { COOKIE_PROJECT } from "@/lib/constants";
import { formatAngka } from "@/lib/format";
import { namaBulanPanjang } from "@/lib/date";
import TabelScope from "@/components/laporan/TabelScope";
import BagianAtas from "../BagianAtas";

export const metadata: Metadata = { title: "Item Tambahan" };

/**
 * Tab 3 laporan bulanan: request scope tambahan. Meniru sheet
 * "Tambahan Scope {Bulan Tahun}".
 */
export default async function LaporanScopePage({
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

  const [proyek, daftar, kpi] = await Promise.all([
    getProyek(),
    getScope(opsi),
    getKpiScope(opsi),
  ]);

  return (
    <div className="cetak-laporan space-y-3">
      <BagianAtas
        judul={`Item Tambahan — ${namaBulanPanjang(opsi.bulan)}`}
        subjudul={`Daftar request ${namaBulanPanjang(opsi.bulan).toLowerCase()}.`}
        bulan={opsi.bulan}
        projectId={opsi.projectId}
        proyek={proyek}
        tab="scope"
      />

      <StatStrip
        items={[
          { label: "Total request", value: formatAngka(kpi.total) },
          { label: "Di luar Schedule Phase 2", value: formatAngka(kpi.luarPhase) },
          { label: "Jumlah requester", value: formatAngka(kpi.requester) },
          { label: "Sudah disetujui", value: formatAngka(kpi.disetujui) },
        ]}
      />

      <Panel title="Request scope tambahan">
        <TabelScope
          awal={daftar}
          bulan={opsi.bulan}
          projectId={opsi.projectId}
        />
      </Panel>
    </div>
  );
}