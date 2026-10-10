"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import {
  Breadcrumb,
  Button,
  Panel,
  SeverityChip,
  Lozenge,
  Textarea,
} from "@/components/ui";
import { AvatarInitials, StatusCyclePenuh } from "@/components/BugRow";
import { ISTILAH, PRIORITAS_JIRA, URUTAN_BOARD, namaStatus } from "@/lib/jira";
import { formatTanggal, formatTanggalJam } from "@/lib/format";

interface Detail {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  steps: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  severity: string;
  priority: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  project?: { name: string } | null;
  module?: { name: string } | null;
  reporter?: { name: string } | null;
  assigneeId?: number | null;
  assignee?: { name: string } | null;
  history: Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedAt: string;
    changedBy?: { name: string } | null;
  }>;
  comments: Array<{
    id: number;
    body: string;
    createdAt: string;
    user?: { name: string } | null;
  }>;
  attachments?: {
    id: number;
    fileName: string;
    sizeBytes: number | null;
  }[];
}

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const bugId = params.id as string;

  const [bug, setBug] = useState<Detail | null>(null);
  const [sudahTermuat, setSudahTermuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [komentar, setKomentar] = useState("");
  const [catatanStatus, setCatatanStatus] = useState("");
  const [statusBaru, setStatusBaru] = useState("");
  const [semuaUser, setSemuaUser] = useState<
    Array<{ id: number; name: string; role: string }>
  >([]);
  const [menyimpanAssignee, setMenyimpanAssignee] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [kirimKomentar, setKirimKomentar] = useState(false);
  const [mengunggah, setMengunggah] = useState(false);

  useEffect(() => {
    let batal = false;
    (async () => {
      const res = await fetch(`/api/bugs/${bugId}`);
      if (batal) return;
      if (!res.ok) {
        setGalat("Issue tidak ditemukan.");
        setSudahTermuat(true);
        return;
      }
      const json = await res.json();
      setBug(json.data);
      setSudahTermuat(true);
    })();
    return () => {
      batal = true;
    };
  }, [bugId]);

  // Daftar user untuk pemilih assignee.
  useEffect(() => {
    let batal = false;
    (async () => {
      const res = await fetch("/api/users");
      const json = res.ok ? await res.json() : { data: [] };
      if (!batal) setSemuaUser(json.data ?? []);
    })();
    return () => {
      batal = true;
    };
  }, []);

  async function ubahStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!statusBaru || !bug) return;
    setMenyimpan(true);
    const res = await fetch(`/api/bugs/${bug.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: statusBaru,
        ...(catatanStatus ? { note: catatanStatus } : {}),
      }),
    });
    setMenyimpan(false);
    if (res.ok) {
      toast.tampil(`Issue dipindahkan ke ${namaStatus(statusBaru)}`);
      setStatusBaru("");
      setCatatanStatus("");
      const refetch = await fetch(`/api/bugs/${bugId}`);
      setBug((await refetch.json()).data);
    } else {
      const j = await res.json().catch(() => ({}) as { error?: string });
      toast.tampil(j.error ?? "Status gagal diubah.", { tone: "warn" });
    }
  }

  async function ubahAssignee(nilai: string) {
    if (!bug) return;
    setMenyimpanAssignee(true);
    const res = await fetch(`/api/bugs/${bug.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee_id: nilai === "" ? null : nilai }),
    });
    setMenyimpanAssignee(false);
    if (res.ok) {
      const refetch = await fetch(`/api/bugs/${bugId}`);
      setBug((await refetch.json()).data);
      const nama = semuaUser.find((u) => String(u.id) === nilai)?.name;
      toast.tampil(nama ? `Assigned to ${nama}` : "Issue dikosongkan dari assignee");
    } else {
      const j = await res.json().catch(() => ({}) as { error?: string });
      toast.tampil(j.error ?? "Assignee gagal diubah.", { tone: "warn" });
    }
  }

  async function tambahKomentar(e: React.FormEvent) {
    e.preventDefault();
    if (!komentar.trim() || !bug) return;
    setKirimKomentar(true);
    const res = await fetch(`/api/bugs/${bug.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: komentar }),
    });
    setKirimKomentar(false);
    if (res.ok) {
      setKomentar("");
      const refetch = await fetch(`/api/bugs/${bugId}`);
      setBug((await refetch.json()).data);
      toast.tampil("Comment added");
    }
  }

  async function unggah(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    if (!input.files?.length) return;
    setMengunggah(true);
    const fd = new FormData();
    fd.append("file", input.files[0]);
    fd.append("bug_id", bugId);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    setMengunggah(false);
    const j = await res.json().catch(() => ({}) as { error?: string });
    if (!res.ok) {
      toast.tampil(j.error ?? "Upload gagal.", { tone: "warn" });
      return;
    }
    input.value = "";
    const refetch = await fetch(`/api/bugs/${bugId}`);
    setBug((await refetch.json()).data);
    toast.tampil("Attachment uploaded");
  }

  if (!sudahTermuat) {
    return (
      <div className="p-6">
        <p className="text-sm text-ink-2">Loading issue...</p>
      </div>
    );
  }

  if (galat || !bug) {
    return (
      <div className="p-6">
        <p className="text-sm text-warn">{galat ?? "Issue tidak ditemukan."}</p>
        <Link href="/bugs" className="mt-2 inline-block text-sm text-accent hover:underline">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const prioritas = PRIORITAS_JIRA[bug.priority];

  return (
    <div className="space-y-3">
      <Breadcrumb
        crumbs={[
          { label: "Bug Tracker", href: "/dashboard" },
          { label: ISTILAH.bugCapPlural, href: "/bugs" },
          { label: bug.code ?? `#${bug.id}` },
        ]}
      />

      {/* Header: key, summary, strip siklus, form pindah status */}
      <div className="rounded-panel border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="code text-xs font-medium text-ink-2">{bug.code}</span>
              <SeverityChip severity={bug.severity} />
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: prioritas?.warna }}
              >
                {prioritas?.label}
              </span>
            </div>
            <h1 className="mt-1 text-xl leading-6 font-bold text-ink">{bug.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusCyclePenuh status={bug.status} />
          </div>
        </div>

        <form
          onSubmit={ubahStatus}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-3"
        >
          <div>
            <label className="mb-1 block text-[11px] font-bold tracking-wide text-ink-2 uppercase">
              Transition
            </label>
            <select
              value={statusBaru}
              onChange={(e) => setStatusBaru(e.target.value)}
              className="h-8 rounded-control border border-line-strong bg-surface px-2 text-sm"
            >
              <option value="">Move to...</option>
              {URUTAN_BOARD.filter((s) => s !== bug.status).map((s) => (
                <option key={s} value={s}>
                  {namaStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-[11px] font-bold tracking-wide text-ink-2 uppercase">
              Comment
            </label>
            <input
              value={catatanStatus}
              onChange={(e) => setCatatanStatus(e.target.value)}
              className="h-8 w-full rounded-control border border-line-strong bg-surface px-2 text-sm"
              placeholder="Opsional"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={menyimpan || !statusBaru}
          >
            Transition
          </Button>
        </form>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Kolom konten */}
        <div className="space-y-3 lg:col-span-2">
          <Panel title="Description">
            <div className="space-y-3 p-4 text-sm text-ink-2">
              <Bagian judul="Description" isi={bug.description} />
              <Bagian judul="Steps to reproduce" isi={bug.steps} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Bagian judul="Expected result" isi={bug.expectedResult} />
                <Bagian judul="Actual result" isi={bug.actualResult} />
              </div>
              <Bagian judul="Environment" isi={bug.environment} />
            </div>
          </Panel>

          <Panel
            title={`Attachments (${bug.attachments?.length ?? 0})`}
            bodyClassName="p-4"
          >
            <form onSubmit={unggah} className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                className="text-xs text-ink-2"
              />
              <Button type="submit" disabled={mengunggah}>
                {mengunggah ? "Uploading..." : "Attach file"}
              </Button>
            </form>
            {(bug.attachments?.length ?? 0) > 0 && (
              <ul className="mt-3 space-y-1">
                {bug.attachments?.map((a) => (
                  <li key={a.id} className="text-sm text-ink-2">
                    {a.fileName}{" "}
                    <span className="text-ink-3">
                      ({a.sizeBytes ? `${(a.sizeBytes / 1024).toFixed(1)} KB` : "-"})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Comments (${bug.comments.length})`} bodyClassName="p-4">
            <form onSubmit={tambahKomentar}>
              <Textarea
                rows={3}
                value={komentar}
                onChange={(e) => setKomentar(e.target.value)}
                placeholder="Add a comment"
              />
              <Button
                type="submit"
                variant="primary"
                className="mt-2"
                disabled={kirimKomentar || !komentar.trim()}
              >
                Save
              </Button>
            </form>
            <ul className="mt-4 space-y-3">
              {bug.comments.map((c) => (
                <li key={c.id} className="border-b border-line pb-3 last:border-b-0">
                  <div className="mb-1 flex items-center gap-2">
                    <AvatarInitials nama={c.user?.name} size={20} />
                    <span className="text-sm font-semibold text-ink">
                      {c.user?.name}
                    </span>
                    <span className="text-xs text-ink-3">
                      {formatTanggalJam(c.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-ink-2">{c.body}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <Panel title="Details" bodyClassName="p-4">
            <dl className="space-y-2.5 text-sm">
              <Baris label="Status" nilai={<Lozenge status={bug.status} />} />
              <Baris label="Severity" nilai={<SeverityChip severity={bug.severity} />} />
              <Baris
                label="Priority"
                nilai={
                  <span
                    className="text-xs font-bold uppercase"
                    style={{ color: prioritas?.warna }}
                  >
                    {prioritas?.label}
                  </span>
                }
              />
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-[11px] font-bold tracking-wide text-ink-3 uppercase">
                  Assignee
                </dt>
                <dd className="min-w-0 flex-1">
                  {/* Semua user terdaftar bisa dipilih, apa pun perannya. */}
                  <select
                    value={bug.assigneeId ?? ""}
                    onChange={(e) => void ubahAssignee(e.target.value)}
                    disabled={menyimpanAssignee}
                    aria-label="Assignee"
                    className="h-7 w-full rounded-control border border-line-strong bg-surface px-1.5 text-right text-sm text-ink disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {semuaUser.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <Baris label="Reporter" nilai={bug.reporter?.name ?? "-"} />
              <Baris label={ISTILAH.modulCap} nilai={bug.module?.name ?? "-"} />
              <Baris label="Project" nilai={bug.project?.name ?? "-"} />
              <Baris label="Created" nilai={formatTanggal(bug.createdAt)} />
              <Baris label="Updated" nilai={formatTanggal(bug.updatedAt)} />
              {bug.closedAt && (
                <Baris label="Resolved" nilai={formatTanggal(bug.closedAt)} />
              )}
            </dl>
          </Panel>

          <Panel title="History" bodyClassName="p-4">
            <ol className="relative space-y-3 border-l-2 border-line pl-4">
              {bug.history.map((h) => (
                <li key={h.id}>
                  <span
                    aria-hidden="true"
                    className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-accent"
                  />
                  <p className="text-sm font-semibold text-ink">
                    {h.fromStatus ? `${namaStatus(h.fromStatus)} → ` : ""}
                    {namaStatus(h.toStatus)}
                  </p>
                  {h.note && <p className="text-sm text-ink-2">{h.note}</p>}
                  <p className="text-xs text-ink-3">
                    {h.changedBy?.name} • {formatTanggalJam(h.changedAt)}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          <Button variant="subtle" onClick={() => router.push("/bugs")}>
            Kembali ke daftar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bagian({ judul, isi }: { judul: string; isi: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-wide text-ink-2 uppercase">
        {judul}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{isi || "-"}</p>
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-[11px] font-bold tracking-wide text-ink-3 uppercase">
        {label}
      </dt>
      <dd className="truncate text-right text-ink-2">{nilai}</dd>
    </div>
  );
}