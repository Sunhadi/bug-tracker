import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Panel, StatStrip, EmptyState } from "@/components/ui";
import {
  getDetailItem,
  getDikecualikan,
  getJumlahPerKategori,
  getKategori,
  getProyek,
  getSubjudulAnalisis,
  getTrendDibuat,
  getTrendSelesai,
} from "@/lib/reports-bulanan";
import {
  bacaBulan,
  bacaOpsiLengkap,
  bacaProjectId,
  bacaSertakanTambahan,
  buatQuery,
  type SearchParams,
} from "@/lib/params-bulanan";
import { COOKIE_PROJECT } from "@/lib/constants";
import { formatAngka, formatPersen, formatTanggalDariKunci } from "@/lib/format";
import { geserBulan, namaBulanPanjang } from "@/lib/date";
import DetailItemTable from "@/components/laporan/DetailItemTable";
import { GrafikKategoriBatang, GrafikSelesai, GrafikTrendDibuat } from "../Grafik";
import SaklarHitung from "../SaklarHitung";
import TombolSertakan from "../TombolSertakan";
import BagianAtas from "../BagianAtas";

export const metadata: Metadata = { title: "Analisis Trend Bug" };

/**
 * Tab 1 laporan bulanan: jumlah bug per kategori, tren per tanggal dibuat,
 * tren penyelesaian, dan detail issue per kategori.
 */
export default async function LaporanKategoriPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Project terpilih: parameter URL lebih dulu, kalau tidak ada pakai cookie
  // project yang sedang aktif di sidebar.
  const store = await cookies();
  const dariCookie = parseInt(store.get(COOKIE_PROJECT)?.value ?? "", 10);
  const spLengkap: SearchParams = {
    ...sp,
    project_id: sp.project_id ?? (Number.isFinite(dariCookie) ? String(dariCookie) : undefined),
  };

  const opsi = await bacaOpsiLengkap(spLengkap);
  const bulan = bacaBulan(spLengkap);
  const projectId = bacaProjectId(spLengkap);
  const sertakan = bacaSertakanTambahan(spLengkap);
  const tampilkanDikecualikan = sp.dikecualikan === "1";

  const [
    proyek,
    daftarKategori,
    subjudul,
    perKategori,
    trend,
    selesai,
    detail,
    daftarDikecualikan,
  ] = await Promise.all([
    getProyek(),
    getKategori(),
    getSubjudulAnalisis(opsi),
    getJumlahPerKategori(opsi),
    getTrendDibuat(opsi),
    getTrendSelesai(opsi),
    getDetailItem(opsi),
    tampilkanDikecualikan
      ? getDikecualikan(opsi)
      : Promise.resolve([] as Awaited<ReturnType<typeof getDikecualikan>>),
  ]);

  const warna: Record<string, string> = {};
  for (const k of daftarKategori) warna[k.name] = k.color;

  const totalItem = perKategori.reduce((s, r) => s + r.jumlah, 0);
  const terbesar = perKategori[0];
  const namaProject =
    proyek.find((p) => p.id === projectId)?.name ?? "Semua Project";

  const qs = buatQuery({ bulan, projectId, hitung: sertakan ? "bug+tambahan" : "" });

  return (
    <div className="cetak-laporan space-y-3">
      <BagianAtas
        judul={`Analisis Trend Bug — ${namaProject}`}
        subjudul={`Analisis ${subjudul.jira} issue Jira + ${subjudul.tambahan} temuan tambahan (${subjudul.total} item) | ${subjudul.excluded} issue dikeluarkan dari analisis`}
        bulan={bulan}
        projectId={projectId}
        proyek={proyek}
        tab="kategori"
      />

      <div className="flex flex-wrap items-center gap-2">
        <SaklarHitung bulan={bulan} projectId={projectId} aktif={sertakan} />
        <span className="text-xs text-ink-3">
          {sertakan
            ? "Bug + temuan tambahan (padanan sheet \"+ Tambahan\")"
            : "Hanya bug (padanan sheet \"Trend Kategori Bug\")"}
        </span>
      </div>

      <StatStrip
        items={[
          { label: "Total item", value: formatAngka(totalItem) },
          {
            label: "Kategori terbesar",
            value: terbesar ? (
              <>
                {terbesar.jumlah}
                <span className="ml-1.5 text-sm font-medium text-ink-2">
                  {formatPersen(terbesar.persen)}
                </span>
              </>
            ) : (
              "0"
            ),
          },
          {
            label: "Selesai",
            value: formatAngka(subjudul.selesai),
          },
          {
            label: "Belum selesai",
            value: formatAngka(subjudul.belumSelesai),
            tone: subjudul.belumSelesai > 0 ? "warn" : "default",
          },
        ]}
      />

      {totalItem === 0 ? (
        <Panel>
          <EmptyState
            judul="Belum ada item pada bulan ini"
            deskripsi={`Tidak ada issue yang dibuat pada ${namaBulanPanjang(bulan)}. Pilih bulan lain lewat kontrol di atas.`}
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Jumlah Bug per Kategori" bodyClassName="p-3">
              <GrafikKategoriBatang data={perKategori} />
            </Panel>

            <Panel title="Jumlah Bug per Kategori" bodyClassName="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                    <th scope="col" className="px-4 py-2 font-semibold">Kategori Issue</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Jumlah</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {perKategori.map((r) => (
                    <tr key={r.kategori} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-1.5">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: r.color }}
                          />
                          {r.kategori}
                        </span>
                      </td>
                      <td className="num px-3 py-1.5 text-right">{r.jumlah}</td>
                      <td className="num px-4 py-1.5 text-right text-ink-2">
                        {formatPersen(r.persen)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-line-strong bg-surface-hover font-semibold">
                    <td className="px-4 py-2">TOTAL</td>
                    <td className="num px-3 py-2 text-right">{totalItem}</td>
                    <td className="num px-4 py-2 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel
            title="Trend Bug per Tanggal Dibuat"
            bodyClassName="p-3"
          >
            <GrafikTrendDibuat data={trend} warna={warna} />
          </Panel>

          <Panel
            title="Trend Bug per Tanggal Dibuat"
            bodyClassName="overflow-x-auto"
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                  <th scope="col" className="px-4 py-2 font-semibold">Tanggal</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Total Bug</th>
                  {perKategori.map((k) => (
                    <th key={k.kategori} scope="col" className="px-3 py-2 text-right font-semibold">
                      {k.kategori}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.tanggal} className="border-b border-line/60 last:border-0">
                    <td className="num px-4 py-1.5 whitespace-nowrap">
                      {formatTanggalDariKunci(t.tanggal)}
                    </td>
                    <td className="num px-3 py-1.5 text-right font-semibold">{t.total}</td>
                    {perKategori.map((k) => (
                      <td key={k.kategori} className="num px-3 py-1.5 text-right text-ink-2">
                        {t.perKategori[k.kategori] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Trend Penyelesaian Bug per Tanggal Selesai"
            bodyClassName="p-3"
          >
            <GrafikSelesai data={selesai} />
          </Panel>

          <Panel title="Detail Issue per Kategori">
            <DetailItemTable awal={detail} kategori={daftarKategori} />
          </Panel>

          <Panel
            title="Dikecualikan dari analisis"
            actions={
              <TombolSertakan
                bulan={bulan}
                projectId={projectId}
                aktif={tampilkanDikecualikan}
                total={subjudul.excluded}
              />
            }
            bodyClassName="overflow-x-auto"
          >
            {!tampilkanDikecualikan ? (
              <EmptyState
                judul="Bagian ini disembunyikan"
                deskripsi={`${subjudul.excluded} issue dikeluarkan dari analisis sesuai permintaan.`}
              />
            ) : daftarDikecualikan.length === 0 ? (
              <EmptyState judul="Tidak ada issue yang dikecualikan" />
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                    <th scope="col" className="px-4 py-2 font-semibold">Key</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Judul Bug</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Dibuat</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Alasan dikeluarkan</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarDikecualikan.map((d) => (
                    <tr key={d.id} className="border-b border-line/60 last:border-0">
                      <td className="num px-4 py-1.5 text-xs font-semibold text-ink-2">
                        {d.jiraKey ?? d.code}
                      </td>
                      <td className="px-3 py-1.5">{d.title}</td>
                      <td className="num px-3 py-1.5 text-xs whitespace-nowrap text-ink-2">
                        {formatTanggalDariKunci(d.tanggal)}
                      </td>
                      <td className="px-4 py-1.5 text-xs text-ink-2">
                        {d.excludeReason ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}

      {/* Navigasi cepat ke bulan sekitar, dipakai footer cetak. */}
      <nav aria-label="Bulan sekitar" className="no-print flex justify-between text-xs">
        <a
          href={`/laporan/bulanan/kategori${buatQuery({
            bulan: geserBulan(bulan, -1),
            projectId,
            hitung: sertakan ? "bug+tambahan" : "",
          })}`}
          className="text-ink-2 hover:text-accent hover:underline"
        >
          {namaBulanPanjang(geserBulan(bulan, -1))}
        </a>
        <a
          href={`/laporan/bulanan/kategori${qs}`}
          className="text-ink-2 hover:text-accent hover:underline"
        >
          {namaBulanPanjang(bulan)}
        </a>
        <a
          href={`/laporan/bulanan/kategori${buatQuery({
            bulan: geserBulan(bulan, 1),
            projectId,
            hitung: sertakan ? "bug+tambahan" : "",
          })}`}
          className="text-ink-2 hover:text-accent hover:underline"
        >
          {namaBulanPanjang(geserBulan(bulan, 1))}
        </a>
      </nav>
    </div>
  );
}