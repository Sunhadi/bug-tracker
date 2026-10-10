import { Breadcrumb } from "@/components/ui";
import KontrolBulanan from "./KontrolBulanan";
import TabBulanan from "./TabBulanan";

/**
 * Kerangka atas laporan bulanan. Dipakai ketiga tab supaya judul, kontrol,
 * dan tab tidak ditulis ulang tiga kali.
 */
export default function BagianAtas({
  judul,
  subjudul,
  bulan,
  projectId,
  proyek,
  tab,
}: {
  judul: string;
  subjudul: string;
  bulan: string;
  projectId: number | null;
  proyek: { id: number; name: string }[];
  tab: "kategori" | "klien" | "scope";
}) {
  return (
    <div className="no-print space-y-3">
      <Breadcrumb
        crumbs={[
          { label: "Bug Tracker", href: "/dashboard" },
          { label: "Laporan bulanan" },
          { label: tab === "kategori" ? "Kategori Bug" : tab === "klien" ? "Bug Klien" : "Scope Tambahan" },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] leading-6 font-bold tracking-[-0.01em] text-ink">
            {judul}
          </h1>
          <p className="mt-0.5 text-sm text-ink-2">{subjudul}</p>
        </div>
      </div>
      <KontrolBulanan
        bulan={bulan}
        projectId={projectId}
        proyek={proyek}
        tab={tab}
      />
      <TabBulanan />
    </div>
  );
}