import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { Breadcrumb, PageHeader } from "@/components/ui";
import KelolaKategori from "@/components/laporan/KelolaKategori";
import type { Kategori } from "@/lib/reports-bulanan";

export const metadata: Metadata = { title: "Kategori bug" };

/** Pengaturan → Kategori bug. Daftar kategori bukan hardcode di halaman. */
export default async function PengaturanKategoriPage() {
  const hasil = await db.execute(sql`
    SELECT c.id, c.name, c.color, c.sort_order, c.is_active,
           COALESCE(x.jumlah, 0)::int AS jumlah
    FROM bug_categories c
    LEFT JOIN (
      SELECT category_id, count(*) AS jumlah FROM bugs GROUP BY category_id
    ) x ON x.category_id = c.id
    ORDER BY c.sort_order, c.name
  `);

  const daftar = Array.from(hasil as Iterable<Kategori & { jumlah: number }>);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Kategori bug"
        description="Kategori dipakai di laporan bulanan, tabel detail, dan warna grafik. Urutan menentukan urutan tampil."
      >
        <Breadcrumb
          crumbs={[
            { label: "Bug Tracker", href: "/dashboard" },
            { label: "Pengaturan" },
            { label: "Kategori bug" },
          ]}
        />
      </PageHeader>

      <KelolaKategori awal={daftar} />
    </div>
  );
}