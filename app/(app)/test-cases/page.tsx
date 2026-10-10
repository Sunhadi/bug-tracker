"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectGlobal } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";
import { DataTable, type Kolom } from "@/components/DataTable";
import {
  Breadcrumb,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Panel,
  Textarea,
} from "@/components/ui";
import { ISTILAH } from "@/lib/jira";
import { formatTanggal, formatTanggalJam } from "@/lib/format";

interface TestCase {
  id: number;
  title: string;
  steps: string | null;
  expected: string | null;
  createdAt: string;
  component?: { name: string } | null;
  project?: { name: string } | null;
  lastResult: string | null;
  lastRunAt: string | null;
}

interface ResponenTestCase {
  data: Array<{
    id: number;
    title: string;
    steps: string | null;
    expected: string | null;
    createdAt: string;
    project?: { name: string } | null;
    module?: { name: string } | null;
    runs?: Array<{ result: string; runAt: string }>;
  }>;
}

const WARNA_HASIL: Record<string, string> = {
  pass: "bg-ok-soft text-ok",
  fail: "bg-warn-soft text-warn",
  blocked: "bg-sev-sedang-bg text-sev-sedang-fg",
};

const LABEL_HASIL: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  blocked: "Blocked",
};

export default function TestCasesPage() {
  const router = useRouter();
  const { projectId } = useProjectGlobal();
  const toast = useToast();

  const [rows, setRows] = useState<TestCase[]>([]);
  const [sudahDimuat, setSudahTermuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [dipilih, setDipilih] = useState<TestCase | null>(null);
  const [riwayat, setRiwayat] = useState<
    Array<{ id: number; result: string; runAt: string; note: string | null; bugId: number | null }>
  >([]);

  const [form, setForm] = useState({
    project_id: "",
    title: "",
    steps: "",
    expected: "",
  });

  useEffect(() => {
    let batal = false;
    (async () => {
      const res = await fetch("/api/test-cases");
      if (batal) return;
      if (!res.ok) {
        setGalat("Test cases tidak bisa dimuat.");
        setSudahTermuat(true);
        return;
      }
      const json: ResponenTestCase = await res.json();
      if (batal) return;
      setRows(
        (json.data ?? []).map((tc) => ({
          id: tc.id,
          title: tc.title,
          steps: tc.steps,
          expected: tc.expected,
          createdAt: tc.createdAt,
          component: tc.module ?? null,
          project: tc.project ?? null,
          lastResult: tc.runs?.[0]?.result ?? null,
          lastRunAt: tc.runs?.[0]?.runAt ?? null,
        }))
      );
      setGalat(null);
      setSudahTermuat(true);
    })();
    return () => {
      batal = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!dipilih) return;
    let batal = false;
    (async () => {
      const res = await fetch(`/api/test-cases/${dipilih.id}/run`);
      const json = res.ok ? await res.json() : { data: [] };
      if (!batal) setRiwayat(json.data ?? []);
    })();
    return () => {
      batal = true;
    };
  }, [dipilih, reloadToken]);

  async function buat(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/test-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, project_id: form.project_id || projectId }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ project_id: "", title: "", steps: "", expected: "" });
      toast.tampil("Test case dibuat");
      setReloadToken((n) => n + 1);
    } else {
      const j = await res.json().catch(() => ({}) as { error?: string });
      toast.tampil(j.error ?? "Test case gagal dibuat.", { tone: "warn" });
    }
  }

  async function jalankan(
    testCaseId: number,
    hasil: string,
    catatan: string,
    bugId?: string
  ) {
    const res = await fetch(`/api/test-cases/${testCaseId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: hasil, note: catatan, bug_id: bugId || undefined }),
    });
    if (res.ok) {
      toast.tampil(`Run dicatat: ${LABEL_HASIL[hasil] ?? hasil}`);
      setReloadToken((n) => n + 1);
    } else {
      toast.tampil("Run gagal dicatat.", { tone: "warn" });
    }
  }

  const kolom: Kolom<TestCase>[] = [
    {
      key: "judul",
      header: "Name",
      render: (tc) => (
        <span className="font-semibold text-accent" title={tc.title}>
          {tc.title}
        </span>
      ),
    },
    {
      key: "component",
      header: ISTILAH.modulCap,
      className: "hidden w-[150px] lg:table-cell",
      render: (tc) => tc.component?.name ?? "-",
    },
    {
      key: "hasil",
      header: "Last result",
      className: "w-[130px]",
      render: (tc) =>
        tc.lastResult ? (
          <span
            className={`inline-block rounded-control px-2 py-0.5 text-[11px] font-bold uppercase ${WARNA_HASIL[tc.lastResult]}`}
          >
            {LABEL_HASIL[tc.lastResult]}
          </span>
        ) : (
          <span className="text-xs font-semibold text-ink-3">Not run</span>
        ),
    },
    {
      key: "terakhir",
      header: "Last run",
      className: "w-[150px]",
      render: (tc) =>
        tc.lastRunAt ? formatTanggal(tc.lastRunAt) : <span className="text-ink-3">-</span>,
    },
    {
      key: "aksi",
      header: "",
      className: "w-[92px]",
      render: (tc) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDipilih(tc);
          }}
          className="rounded-control border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink hover:bg-bg"
        >
          Run
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Test case"
        description={`${rows.length} test case`}
        actions={
          // Satu tombol utama di header. Tombol kedua di form dalam keadaan
          // "Tutup", dan empty state punya tombolnya sendiri.
          <Button
            variant={showForm ? "default" : "primary"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Tutup" : "Test case baru"}
          </Button>
        }
      >
        <Breadcrumb
          crumbs={[{ label: "Bug Tracker", href: "/dashboard" }, { label: "Test case" }]}
        />
      </PageHeader>

      {showForm && (
        <Panel title="Test case baru">
          <form onSubmit={buat} className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                Name <span className="font-normal normal-case">(wajib)</span>
              </label>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                Steps
              </label>
              <Textarea
                rows={3}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                Expected result
              </label>
              <Textarea
                rows={2}
                value={form.expected}
                onChange={(e) => setForm({ ...form, expected: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary">
                Save test case
              </Button>
              <Button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel bodyClassName="pb-0">
        <DataTable
          kolom={kolom}
          rows={rows}
          getKey={(tc) => tc.id}
          onOpenRow={(tc) => setDipilih(tc)}
          loading={!sudahDimuat && !galat}
          error={galat}
          onCobaLagi={() => setReloadToken((n) => n + 1)}
          kosong={
            <EmptyState
              judul="Belum ada test case."
              aksi={
                <Button variant="default" onClick={() => setShowForm(true)}>
                  New test case
                </Button>
              }
            />
          }
        />
      </Panel>

      {dipilih && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDipilih(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={dipilih.title}
            className="pop w-full max-w-[720px] rounded-panel bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base leading-6 font-bold text-ink">
                {dipilih.title}
              </h2>
              <button
                type="button"
                onClick={() => setDipilih(null)}
                aria-label="Close"
                className="rounded-control px-2 text-sm text-ink-3 hover:bg-bg"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                    Steps
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">
                    {dipilih.steps || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                    Expected result
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{dipilih.expected || "-"}</p>
                </div>

                <div className="rounded-panel border border-line p-3">
                  <p className="text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                    Run this test
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["pass", "fail", "blocked"] as const).map((r) => (
                      <Button
                        key={r}
                        variant={r === "fail" ? "danger" : "default"}
                        onClick={() => void jalankan(dipilih.id, r, "")}
                      >
                        {LABEL_HASIL[r]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-wide text-ink-2 uppercase">
                  Run history
                </p>
                {riwayat.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-3">Never run.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {riwayat.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-block rounded-control px-2 py-0.5 text-[11px] font-bold uppercase ${WARNA_HASIL[r.result]}`}
                        >
                          {LABEL_HASIL[r.result]}
                        </span>
                        <span className="text-ink-2">{formatTanggalJam(r.runAt)}</span>
                        {r.note && <span className="truncate text-ink-3">{r.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="default" onClick={() => router.push("/bugs")}>
                Lihat issues
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
