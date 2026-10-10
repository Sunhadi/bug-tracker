"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useToast } from "@/components/ToastProvider";
import {
  Breadcrumb,
  Button,
  CharCounter,
  PageHeader,
  Panel,
  Lozenge,
  Textarea,
} from "@/components/ui";
import { SEVERITY_JIRA } from "@/lib/jira";
import {
  DRAF_KOSONG,
  snapshotDraf,
  snapshotDrafServer,
  subscribeDraf,
  tulisDraf,
  type Draf,
} from "@/lib/draftHarian";
import { formatTanggalDariKunci, todayJakarta } from "@/lib/format";

interface StatusChange {
  code: string;
  title: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
}

interface Laporan {
  date: string;
  ditemukan: Array<{ code: string; title: string }>;
  statusChanges: StatusChange[];
  comments: Array<{ code: string; title: string; body: string }>;
  kendala: Array<{ code: string; title: string; status: string; severity: string }>;
}

const MINIMUM = 100;
const KOSONG = DRAF_KOSONG;

export default function DailyReportPage() {
  const [tanggal, setTanggal] = useState(todayJakarta());
  const [data, setData] = useState<Laporan | null>(null);
  const [sudahTermuat, setSudahTermuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  // Draf yang sudah diedit disimpan per tanggal. State-nya hidup di dalam
  // <Editor> yang diberi key tanggal, jadi berganti tanggal me-remount komponen
  // dan draf lama dimuat ulang tanpa perlu setState di dalam efek.
  useEffect(() => {
    let batal = false;
    (async () => {
      const res = await fetch(`/api/reports/daily?date=${tanggal}`);
      if (batal) return;
      if (!res.ok) {
        setGalat("Laporan tidak bisa dimuat.");
        setSudahTermuat(true);
        return;
      }
      const json = await res.json();
      if (batal) return;
      setData(json.data);
      setGalat(null);
      setSudahTermuat(true);
    })();
    return () => {
      batal = true;
    };
  }, [tanggal]);
  /** Perubahan status "dibuat -> baru" sudah tercakup di "Ditemukan". */
  const perubahanSetelahDibuat = useMemo(
    () =>
      (data?.statusChanges ?? []).filter(
        (s) => !(s.from_status === null || s.from_status === "baru")
      ),
    [data]
  );

  const drafDariBahan = useMemo(() => {
    if (!data) return KOSONG;

    const uraian: string[] = [];
    if (data.ditemukan.length > 0) {
      uraian.push(
        `Menemukan ${data.ditemukan.length} issue (${data.ditemukan
          .map((b) => b.code)
          .join(", ")}).`
      );
    }
    const retest = perubahanSetelahDibuat.filter((s) => s.to_status === "retest");
    if (retest.length > 0) {
      uraian.push(
        `Melakukan retest atas ${retest.map((r) => r.code).join(", ")}.`
      );
    }
    const lain = perubahanSetelahDibuat.filter(
      (s) => s.to_status !== "retest"
    );
    if (lain.length > 0) {
      uraian.push(
        `Mengubah status: ${lain
          .map((s) => `${s.code} ke ${s.to_status}`)
          .join(", ")}.`
      );
    }
    if (data.comments.length > 0) {
      uraian.push(
        `Berdiskusi terkait ${Array.from(
          new Set(data.comments.map((c) => c.code))
        ).join(", ")}.`
      );
    }
    if (uraian.length === 0) {
      uraian.push("Tidak ada aktivitas tercatat pada tanggal ini.");
    }

    const kendalaDev = data.kendala.filter((k) =>
      ["baru", "dikonfirmasi", "diperbaiki"].includes(k.status)
    );
    const kendalaRetest = data.kendala.filter(
      (k) => k.status === "retest" || k.status === "dibuka_ulang"
    );
    const kendala: string[] = [];
    if (kendalaDev.length > 0) {
      kendala.push(
        `Menunggu perbaikan dev: ${kendalaDev.map((k) => k.code).join(", ")}.`
      );
    }
    if (kendalaRetest.length > 0) {
      kendala.push(
        `Menunggu retest: ${kendalaRetest.map((k) => k.code).join(", ")}.`
      );
    }
    if (kendala.length === 0) kendala.push("Tidak ada kendala yang menghambat.");

    return { uraian: uraian.join(" "), pembelajaran: "", kendala: kendala.join(" ") };
  }, [data, perubahanSetelahDibuat]);

  const geser = (n: number) => {
    const d = new Date(`${tanggal}T00:00:00`);
    d.setDate(d.getDate() + n);
    setTanggal(d.toISOString().slice(0, 10));
  };

  const total = data
    ? data.ditemukan.length +
      perubahanSetelahDibuat.length +
      data.comments.length +
      data.kendala.length
    : 0;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Laporan harian"
        description={formatTanggalDariKunci(tanggal)}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="default" onClick={() => geser(-1)} aria-label="Hari sebelumnya">
              &larr;
            </Button>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value || todayJakarta())}
              className="h-8 rounded-control border border-line-strong bg-surface px-2 text-sm"
            />
            <Button variant="default" onClick={() => geser(1)} aria-label="Hari berikutnya">
              &rarr;
            </Button>
            <Button variant="subtle" onClick={() => setTanggal(todayJakarta())}>
              Today
            </Button>
          </div>
        }
      >
        <Breadcrumb
          crumbs={[
            { label: "Bug Tracker", href: "/dashboard" },
            { label: "Daily" },
          ]}
        />
      </PageHeader>

      <div className="grid overflow-hidden rounded-panel border border-line bg-surface sm:grid-flow-col">
        {[
          { label: "Found", value: data?.ditemukan.length ?? 0 },
          { label: "Status changed", value: perubahanSetelahDibuat.length },
          { label: "Commented", value: data?.comments.length ?? 0 },
          { label: "Outstanding", value: data?.kendala.length ?? 0 },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-4 py-2.5 ${i > 0 ? "border-t border-line sm:border-t-0 sm:border-l" : ""}`}
          >
            <p className="num text-[22px] leading-7 font-bold text-ink">{s.value}</p>
            <p className="text-xs font-medium text-ink-3">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Bahan dari sistem */}
        <Panel title={`Material (${total})`} bodyClassName="p-3">
          {!sudahTermuat ? (
            <p className="py-6 text-center text-sm text-ink-3">Loading...</p>
          ) : galat ? (
            <p className="py-6 text-center text-sm text-warn">{galat}</p>
          ) : (
            <div className="space-y-3">
              <Grup judul={`Found (${data?.ditemukan.length ?? 0})`}>
                {(data?.ditemukan ?? []).map((b) => (
                  <li key={b.code} className="flex gap-2 text-sm">
                    <span className="code w-[76px] shrink-0 text-ink-3">
                      {b.code}
                    </span>
                    <span className="text-ink-2">{b.title}</span>
                  </li>
                ))}
              </Grup>

              <Grup judul={`Status changed (${perubahanSetelahDibuat.length})`}>
                {perubahanSetelahDibuat.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="code w-[76px] shrink-0 text-ink-3">
                      {s.code}
                    </span>
                    <span className="text-ink-2">
                      {s.from_status ? `${s.from_status} → ` : ""}
                      {s.to_status}
                    </span>
                  </li>
                ))}
              </Grup>

              <Grup judul={`Discussion (${data?.comments.length ?? 0})`}>
                {(data?.comments ?? []).map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="code w-[76px] shrink-0 text-ink-3">
                      {c.code}
                    </span>
                    <span className="truncate text-ink-2">{c.body}</span>
                  </li>
                ))}
              </Grup>

              <Grup judul={`Outstanding (${data?.kendala.length ?? 0})`}>
                {(data?.kendala ?? []).map((k) => (
                  <li key={k.code} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`h-3.5 w-[3px] shrink-0 rounded-full ${SEVERITY_JIRA[k.severity]?.rail ?? "bg-sev-rendah"}`}
                    />
                    <span className="code w-[76px] shrink-0 text-ink-3">
                      {k.code}
                    </span>
                    <span className="truncate text-ink-2">{k.title}</span>
                    <Lozenge status={k.status} />
                  </li>
                ))}
              </Grup>
            </div>
          )}
        </Panel>

        {/* Laporan yang bisa diedit */}
        {/* Tiga kolom laporan. Diberi key tanggal supaya draf ter-load
            ulang dari localStorage setiap kali tanggal berubah. */}
        <Editor key={tanggal} tanggal={tanggal} drafDariBahan={drafDariBahan} />
      </div>
    </div>
  );
}

/**
 * Tiga kolom laporan yang bisa diedit. State draf dipegang di sini dan
 * disimpan ke localStorage per tanggal, jadi tidak hilang saat pindah halaman.
 */
function Editor({
  tanggal,
  drafDariBahan,
}: {
  tanggal: string;
  drafDariBahan: typeof KOSONG;
}) {
  const toast = useToast();
  // Server selalu melihat draft kosong; client melihat draft yang tersimpan.
  // useSyncExternalStore yang menggabungkan kedua snapshot tanpa memicu
  // hydration mismatch.
  const snapshotServer = useCallback(() => snapshotDrafServer(), []);
  const snapshotClient = useCallback(
    () => snapshotDraf(tanggal),
    [tanggal]
  );
  const isi = useSyncExternalStore(
    subscribeDraf,
    snapshotClient,
    snapshotServer
  );

  const ubah = useCallback(
    (baru: Draf) => {
      tulisDraf(tanggal, baru);
    },
    [tanggal]
  );

  function isiDariBahan(kolom: keyof Draf) {
    if (isi[kolom].trim().length > 0) {
      if (!window.confirm("Kolom ini sudah berisi. Timpa dengan bahan sistem?")) {
        return;
      }
    }
    ubah({ ...isi, [kolom]: drafDariBahan[kolom] });
  }

  async function salin(teks: string) {
    try {
      await navigator.clipboard.writeText(teks);
      toast.tampil("Copied");
    } catch {
      toast.tampil("Clipboard tidak bisa diakses.", { tone: "warn" });
    }
  }

  return (
    <div className="space-y-3">
      <Kolom
        judul="Activity"
        nilai={isi.uraian}
        onUbah={(v) => ubah({ ...isi, uraian: v })}
        onIsiBahan={() => isiDariBahan("uraian")}
        onSalin={() => void salin(isi.uraian)}
      />
      <Kolom
        judul="What was learned"
        nilai={isi.pembelajaran}
        onUbah={(v) => ubah({ ...isi, pembelajaran: v })}
        onIsiBahan={() => isiDariBahan("pembelajaran")}
        onSalin={() => void salin(isi.pembelajaran)}
      />
      <Kolom
        judul="Blockers"
        nilai={isi.kendala}
        onUbah={(v) => ubah({ ...isi, kendala: v })}
        onIsiBahan={() => isiDariBahan("kendala")}
        onSalin={() => void salin(isi.kendala)}
      />
      <Button
        variant="default"
        className="w-full"
        onClick={() =>
          void salin(
            [
              "=== ACTIVITY ===",
              isi.uraian,
              "",
              "=== WHAT WAS LEARNED ===",
              isi.pembelajaran,
              "",
              "=== BLOCKERS ===",
              isi.kendala,
            ].join("\n")
          )
        }
      >
        Copy all
      </Button>
      <p className="text-xs text-ink-3">
        Draf disimpan di browser ini per tanggal, jadi tidak hilang saat pindah
        halaman.
      </p>
    </div>
  );
}

function Grup({ judul, children }: { judul: string; children: React.ReactNode }) {
  const kosong = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold tracking-wide text-ink-2 uppercase">
        {judul}
      </p>
      {kosong ? (
        <p className="text-sm text-ink-3">-</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  );
}

function Kolom({
  judul,
  nilai,
  onUbah,
  onIsiBahan,
  onSalin,
}: {
  judul: string;
  nilai: string;
  onUbah: (v: string) => void;
  onIsiBahan: () => void;
  onSalin: () => void;
}) {
  return (
    <Panel bodyClassName="p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{judul}</h2>
        <div className="flex items-center gap-1">
          <Button variant="subtle" onClick={onIsiBahan}>
            Fill from material
          </Button>
          <Button variant="default" onClick={onSalin}>
            Copy
          </Button>
        </div>
      </div>
      <Textarea
        rows={4}
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder="Minimal 100 karakter per kolom."
      />
      <div className="mt-1.5">
        <CharCounter panjang={nilai.length} minimum={MINIMUM} />
      </div>
    </Panel>
  );
}
