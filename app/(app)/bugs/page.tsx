"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProjectGlobal } from "@/components/AppShell";
import { DataTable, type Kolom } from "@/components/DataTable";
import {
  Breadcrumb,
  Button,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Panel,
  Select,
  Lozenge,
  SeverityChip,
} from "@/components/ui";
import { AvatarInitials, type BarisBug } from "@/components/BugRow";
import { PriorityIcon } from "@/components/issue/PriorityIcon";
import { ISTILAH, SEVERITY_JIRA, URUTAN_BOARD, namaStatus } from "@/lib/jira";
import { formatTanggal } from "@/lib/format";

interface ModulOpsi {
  id: number;
  name: string;
  projectId: number;
}

interface UserOpsi {
  id: number;
  name: string;
}

interface BugApi {
  id: number;
  code: string | null;
  title: string;
  status: string;
  severity: string;
  priority: number;
  createdAt: string;
  reporter?: { name: string } | null;
  assignee?: { name: string } | null;
  module?: { name: string } | null;
}

interface ResponenBug {
  data: BugApi[];
  pagination?: { total?: number };
}

/** Filter disimpan di URL supaya bisa dibagikan dan tahan reload. */
const KUNCI_FILTER = [
  "q",
  "status",
  "severity",
  "priority",
  "component",
  "assignee",
  "dari",
  "sampai",
] as const;

export default function BugListPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { projectId: projectGlobal } = useProjectGlobal();

  const [rows, setRows] = useState<BarisBug[]>([]);
  const [total, setTotal] = useState(0);
  const [sudahDimuat, setSudahDimuat] = useState({ key: "", selesai: false });
  const [galat, setGalat] = useState<{ key: string; pesan: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [components, setComponents] = useState<ModulOpsi[]>([]);
  const [users, setUsers] = useState<UserOpsi[]>([]);
  const cariRef = useRef<HTMLInputElement>(null);

  // Baca filter dari URL sebagai sumber kebenaran.
  const cariTerap = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const severity = params.get("severity") ?? "";
  const priority = params.get("priority") ?? "";
  const componentId = params.get("component") ?? "";
  const assignee = params.get("assignee") ?? "";
  const dari = params.get("dari") ?? "";
  const sampai = params.get("sampai") ?? "";

  const setFilter = useCallback((kunci: string, nilai: string) => {
    const sp = new URLSearchParams(params.toString());
    if (nilai) sp.set(kunci, nilai);
    else sp.delete(kunci);
    sp.delete("page");
    router.replace(`/bugs?${sp.toString()}`, { scroll: false });
  }, [params, router]);

  const [cari, setCari] = useState(cariTerap);
  useEffect(() => {
    const t = setTimeout(() => {
      if (cari.trim() !== cariTerap) setFilter("q", cari.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [cari, cariTerap, setFilter]);

  useEffect(() => {
    let batal = false;
    (async () => {
      const [rc, ru] = await Promise.all([
        fetch("/api/modules"),
        fetch("/api/users"),
      ]);
      const jc = rc.ok ? await rc.json() : { data: [] };
      const ju = ru.ok ? await ru.json() : { data: [] };
      if (batal) return;
      setComponents((jc.data ?? []) as ModulOpsi[]);
      setUsers((ju.data ?? []) as UserOpsi[]);
    })();
    return () => {
      batal = true;
    };
  }, [projectGlobal]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (projectGlobal) p.set("project_id", projectGlobal);
    if (componentId) p.set("module_id", componentId);
    if (status) p.set("status", status);
    if (severity) p.set("severity", severity);
    if (priority) p.set("priority", priority);
    if (assignee) p.set("assignee_id", assignee);
    if (dari) p.set("dari", dari);
    if (sampai) p.set("sampai", sampai);
    if (cariTerap) p.set("search", cariTerap);
    p.set("limit", "100");
    return p.toString();
  }, [projectGlobal, componentId, status, severity, priority, assignee, dari, sampai, cariTerap]);

  const loading = sudahDimuat.key !== query || !sudahDimuat.selesai;
  const error = galat?.key === query ? galat.pesan : null;

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/bugs?${query}`);
        if (!res.ok) throw new Error(String(res.status));
        const json: ResponenBug = await res.json();
        if (batal) return;
        setRows(
          json.data.map((b) => ({
            id: b.id,
            code: b.code,
            title: b.title,
            status: b.status,
            severity: b.severity,
            priority: b.priority,
            createdAt: b.createdAt,
            reporterName: b.reporter?.name ?? null,
            assigneeName: b.assignee?.name ?? null,
            componentName: b.module?.name ?? null,
          }))
        );
        setTotal(json.pagination?.total ?? 0);
        setGalat(null);
      } catch {
        if (!batal) setGalat({ key: query, pesan: "Daftar issue tidak bisa dimuat." });
      } finally {
        if (!batal) setSudahDimuat({ key: query, selesai: true });
      }
    })();
    return () => {
      batal = true;
    };
  }, [query, reloadToken]);

  // J dan K untuk navigasi baris, / ke kolom cari.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const mengetik =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (mengetik || e.metaKey || e.ctrlKey) return;

      if (e.key === "/") {
        e.preventDefault();
        cariRef.current?.focus();
        return;
      }
      const tabel = document.querySelector<HTMLTableElement>("tbody tr");
      if (!tabel) return;
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const semua = Array.from(
          document.querySelectorAll<HTMLTableRowElement>("tbody tr")
        );
        const sekarang = semua.findIndex((r) =>
          r.classList.contains("Sorotan")
        );
        const next =
          e.key === "j"
            ? Math.min(semua.length - 1, sekarang + 1)
            : Math.max(0, sekarang <= 0 ? 0 : sekarang - 1);
        semua.forEach((r) => r.classList.remove("Sorotan"));
        const target = semua[next];
        if (target) {
          target.classList.add("Sorotan");
          target.scrollIntoView({ block: "nearest" });
          target.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const adaFilter = KUNCI_FILTER.some((k) => params.get(k));
  const componentsTersedia = components.filter(
    (m) => !projectGlobal || String(m.projectId) === projectGlobal
  );

  function bersihkanFilter() {
    for (const k of KUNCI_FILTER) setFilter(k, "");
    setCari("");
  }

  const kolom: Kolom<BarisBug>[] = [
    {
      key: "severity",
      header: "Severity",
      className: "w-[104px]",
      render: (b) =>
        // Di tabel cukup ditampilkan bila bukan "Sedang", supaya deretan
        // tidak ramai. Kotak kosong tetap punya akses via filter.
        b.severity === "sedang" ? (
          <span className="text-ink-3">Sedang</span>
        ) : (
          <SeverityChip severity={b.severity} rapat />
        ),
    },
    {
      key: "kode",
      header: "Key",
      className: "w-[88px]",
      render: (b) => (
        <span className="text-xs font-medium text-ink-2">{b.code ?? "-"}</span>
      ),
    },
    {
      key: "judul",
      header: "Ringkasan",
      render: (b) => (
        <span className="line-clamp-2 font-medium text-accent" title={b.title}>
          {b.title}
        </span>
      ),
    },
    {
      key: "component",
      header: ISTILAH.modulCap,
      className: "hidden w-[130px] lg:table-cell",
      render: (b) => b.componentName ?? "-",
    },
    {
      key: "status",
      header: "Status",
      className: "w-[136px]",
      render: (b) => <Lozenge status={b.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      className: "w-[92px]",
      render: (b) => <PriorityIcon priority={b.priority} />,
    },
    {
      key: "assignee",
      header: "Assignee",
      className: "hidden w-[140px] lg:table-cell",
      render: (b) =>
        b.assigneeName ? (
          <span className="flex items-center gap-1.5">
            <AvatarInitials nama={b.assigneeName} size={20} />
            <span className="truncate">{b.assigneeName}</span>
          </span>
        ) : (
          <span className="text-ink-3">Belum ada</span>
        ),
    },
    {
      key: "dibuat",
      header: "Dibuat",
      className: "w-[124px]",
      render: (b) => (
        <span className="whitespace-nowrap">
          {formatTanggal(b.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={ISTILAH.bugCapPlural}
        description={`${total} issue`}
        actions={
          <>
            <LinkButton
              href={`/api/reports/export?type=bugs${projectGlobal ? `&project_id=${projectGlobal}` : ""}`}
            >
              Export
            </LinkButton>
            <LinkButton href="/bugs/new" variant="primary">
              Buat issue
            </LinkButton>
          </>
        }
      >
        <Breadcrumb
          crumbs={[
            { label: "Bug Tracker", href: "/dashboard" },
            { label: ISTILAH.bugCapPlural },
          ]}
        />
      </PageHeader>

      {/* Filter bar: semua keadaan filter disimpan di URL */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={cariRef}
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari ringkasan atau key"
          aria-label="Cari ringkasan atau key"
          className="w-[240px]"
        />

        <Select
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          {URUTAN_BOARD.map((s) => (
            <option key={s} value={s}>
              {namaStatus(s)}
            </option>
          ))}
        </Select>

        <Select
          value={priority}
          onChange={(e) => setFilter("priority", e.target.value)}
          aria-label="Filter priority"
        >
          <option value="">Semua priority</option>
          <option value="1">High</option>
          <option value="2">Medium</option>
          <option value="3">Low</option>
        </Select>

        <Select
          value={severity}
          onChange={(e) => setFilter("severity", e.target.value)}
          aria-label="Filter severity"
        >
          <option value="">Semua severity</option>
          {Object.entries(SEVERITY_JIRA).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>

        <Select
          value={componentId}
          onChange={(e) => setFilter("component", e.target.value)}
          aria-label={`Filter ${ISTILAH.modul}`}
        >
          <option value="">Semua component</option>
          {componentsTersedia.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.name}
            </option>
          ))}
        </Select>

        <Select
          value={assignee}
          onChange={(e) => setFilter("assignee", e.target.value)}
          aria-label="Filter assignee"
        >
          <option value="">Semua assignee</option>
          <option value="unassigned">Belum ada</option>
          {users.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {u.name}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-1 text-xs text-ink-2">
          Dari
          <input
            type="date"
            value={dari}
            onChange={(e) => setFilter("dari", e.target.value)}
            className="h-8 rounded-control border border-line-strong bg-surface px-1.5 text-xs"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-2">
          Sampai
          <input
            type="date"
            value={sampai}
            onChange={(e) => setFilter("sampai", e.target.value)}
            className="h-8 rounded-control border border-line-strong bg-surface px-1.5 text-xs"
          />
        </label>

        {adaFilter && (
          <Button variant="link" onClick={bersihkanFilter}>
            Bersihkan filter
          </Button>
        )}
      </div>

      <Panel bodyClassName="pb-0">
        <DataTable
          kolom={kolom}
          rows={rows}
          getKey={(b) => b.id}
          onOpenRow={(b) => router.push(`/bugs/${b.id}`)}
          loading={loading}
          error={error}
          onCobaLagi={() => setReloadToken((n) => n + 1)}
          kosong={
            adaFilter ? (
              <EmptyState
                judul="Tidak ada issue yang cocok dengan filter ini."
                aksi={
                  <Button variant="default" onClick={bersihkanFilter}>
                    Bersihkan filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                judul="Belum ada issue."
                deskripsi="Issue yang dibuat akan muncul di sini."
                aksi={
                  <LinkButton href="/bugs/new" variant="default">
                    Buat issue
                  </LinkButton>
                }
              />
            )
          }
        />
      </Panel>
    </div>
  );
}
