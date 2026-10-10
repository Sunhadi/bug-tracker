"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useProjectGlobal } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";
import { DialogCatatan, MenuPindahStatus } from "@/components/KanbanDialog";
import { Button, EmptyState, LinkButton, PageHeader, SeverityRail, kelasSeverity } from "@/components/ui";
import { AvatarInitials } from "@/components/BugRow";
import { useGeserHorizontal } from "@/components/useGeserHorizontal";
import {
  ISTILAH,
  PRIORITAS_JIRA,
  URUTAN_BOARD,
  namaStatus,
  warnaStatus,
} from "@/lib/jira";
import { formatUmur } from "@/lib/format";

interface BugKanban {
  id: number;
  code: string | null;
  title: string;
  status: string;
  severity: string;
  priority: number;
  createdAt: string;
  assigneeName?: string | null;
}

interface BugApi {
  id: number;
  code: string | null;
  title: string;
  status: string;
  severity: string;
  priority: number;
  createdAt: string;
  assignee?: { name: string } | null;
}

type PetaBug = Record<string, BugKanban[]>;

function kosongkanPeta(): PetaBug {
  const peta: PetaBug = {};
  for (const s of URUTAN_BOARD) peta[s] = [];
  return peta;
}

function kelompokkan(list: BugApi[]): PetaBug {
  const peta = kosongkanPeta();
  for (const b of list) {
    if (peta[b.status]) {
      peta[b.status].push({
        id: b.id,
        code: b.code,
        title: b.title,
        status: b.status,
        severity: b.severity,
        priority: b.priority,
        createdAt: b.createdAt,
        assigneeName: b.assignee?.name ?? null,
      });
    }
  }
  return peta;
}

/** Kolom yang boleh dilipat: dua status terakhir, terminal. */
const BISA_LIPAT = ["selesai", "ditolak"];

export default function KanbanPage() {
  const { projectId } = useProjectGlobal();
  const toast = useToast();

  const [peta, setPeta] = useState<PetaBug>(kosongkanPeta);
  const [sudahDimuat, setSudahDimuat] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [aktifDrag, setAktifDrag] = useState<BugKanban | null>(null);
  const [kolomTersorot, setKolomTersorot] = useState<string | null>(null);
  const [terlipat, setTerlipat] = useState<Record<string, boolean>>({});
  const [dialogStatus, setDialogStatus] = useState<{
    bug: BugKanban;
    status: string;
    snapshot: PetaBug;
  } | null>(null);
  const [menu, setMenu] = useState<{
    bug: BugKanban;
    atas: number;
    kiri: number;
  } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const papanRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posisiX = useRef<number | null>(null);
  const geser = useGeserHorizontal(papanRef);

  const query = projectId ? `project_id=${projectId}&` : "";

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/bugs?${query}limit=200`);
        if (!res.ok) throw new Error(String(res.status));
        const json: { data: BugApi[] } = await res.json();
        if (batal) return;
        const kelompok = kelompokkan(json.data);
        setPeta(kelompok);
        setGalat(null);
        const next: Record<string, boolean> = {};
        for (const s of BISA_LIPAT) {
          next[s] = (kelompok[s]?.length ?? 0) === 0;
        }
        setTerlipat((prev) => ({ ...next, ...prev }));
      } catch {
        if (!batal) setGalat("Board tidak bisa dimuat.");
      } finally {
        if (!batal) setSudahDimuat(query);
      }
    })();
    return () => {
      batal = true;
    };
  }, [query, reloadToken]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const jalankanPindah = useCallback(
    async (
      bug: BugKanban,
      statusBaru: string,
      catatan: string | undefined,
      snapshot: PetaBug
    ) => {
      const res = await fetch(`/api/bugs/${bug.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusBaru,
          ...(catatan ? { note: catatan } : {}),
        }),
      });

      if (!res.ok) {
        setPeta(snapshot);
        const json = await res.json().catch(() => ({}) as { error?: string });
        toast.tampil(json.error ?? "Status issue tidak bisa diubah.", {
          tone: "warn",
        });
        return;
      }

      toast.tampil(
        `${bug.code ?? "Issue"} dipindahkan ke ${namaStatus(statusBaru)}`,
        { aksi: { label: "Urungkan", jalankan: () => setPeta(snapshot) } }
      );
    },
    [toast]
  );

  function onDragStart(e: DragStartEvent) {
    const bug = cariBug(peta, e.active.id);
    setAktifDrag(bug);
    setKolomTersorot(bug?.status ?? null);
    mulaiAutoScroll();
  }

  // Auto-scroll saat menyeret ke tepi: kolom yang tersembunyi tetap bisa
  // dijangkau tanpa harus melepas drag lebih dulu.
  function mulaiAutoScroll() {
    stopAutoScroll();
    autoScrollRef.current = setInterval(() => {
      const el = papanRef.current;
      const x = posisiX.current;
      if (!el || x === null) return;
      const kotak = el.getBoundingClientRect();
      const tepi = 64;
      if (x < kotak.left + tepi) el.scrollLeft -= 14;
      else if (x > kotak.right - tepi) el.scrollLeft += 14;
    }, 16);
  }

  function stopAutoScroll() {
    if (autoScrollRef.current !== null) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    posisiX.current = null;
  }

  function onDragEnd(e: DragEndEvent) {
    stopAutoScroll();
    setAktifDrag(null);
    setKolomTersorot(null);

    const bug = cariBug(peta, e.active.id);
    if (!bug) return;
    const statusTujuan = tentukanKolomTujuan(e);
    if (!statusTujuan || statusTujuan === bug.status) return;

    const snapshot = peta;
    setTerlipat((p) => (p[statusTujuan] ? { ...p, [statusTujuan]: false } : p));
    setPeta({
      ...peta,
      [bug.status]: peta[bug.status].filter((b) => b.id !== bug.id),
      [statusTujuan]: [...peta[statusTujuan], { ...bug, status: statusTujuan }],
    });

    if (BISA_LIPAT.includes(statusTujuan)) {
      setDialogStatus({ bug, status: statusTujuan, snapshot });
      return;
    }
    void jalankanPindah(bug, statusTujuan, undefined, snapshot);
  }

  function tentukanKolomTujuan(e: DragEndEvent): string | null {
    const overId = e.over?.id;
    if (overId === undefined || overId === null) return null;
    const langsung = String(overId);
    if (langsung.startsWith("kolom:")) return langsung.slice(6);
    return cariBug(peta, overId)?.status ?? null;
  }

  function pindahLewatMenu(status: string) {
    const bug = menu?.bug;
    setMenu(null);
    if (!bug || status === bug.status) return;
    const snapshot = peta;
    setTerlipat((p) => (p[status] ? { ...p, [status]: false } : p));
    setPeta({
      ...peta,
      [bug.status]: peta[bug.status].filter((b) => b.id !== bug.id),
      [status]: [...peta[status], { ...bug, status }],
    });
    if (BISA_LIPAT.includes(status)) {
      setDialogStatus({ bug, status, snapshot });
      return;
    }
    void jalankanPindah(bug, status, undefined, snapshot);
  }

  const totalBug = useMemo(
    () => Object.values(peta).reduce((n, l) => n + l.length, 0),
    [peta]
  );

  const loading = sudahDimuat !== query;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        stopAutoScroll();
        setAktifDrag(null);
        setKolomTersorot(null);
      }}
    >
      <div className="space-y-3">
        <PageHeader
          title={ISTILAH.papan}
          description={`${totalBug} issue · ${URUTAN_BOARD.length} kolom`}
          actions={
            <LinkButton href="/bugs/new" variant="primary">
              Create issue
            </LinkButton>
          }
        />

        {galat ? (
          <EmptyState
            judul="Gagal memuat board"
            deskripsi={galat}
            aksi={
              <Button
                variant="default"
                onClick={() => setReloadToken((n) => n + 1)}
              >
                Coba lagi
              </Button>
            }
          />
        ) : loading ? (
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-[400px] w-[280px] shrink-0 rounded-panel border border-line bg-kanban-col"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : totalBug === 0 ? (
          <EmptyState
            judul="Belum ada issue."
            deskripsi="Issue yang dibuat akan muncul di kolom To Do."
            aksi={
              <LinkButton href="/bugs/new" variant="default">
                Create issue
              </LinkButton>
            }
          />
        ) : (
          <div
            ref={papanRef}
            {...geser.handler}
            className={`scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 ${
              geser.seret ? "" : "geser-x"
            }`}
          >
            {URUTAN_BOARD.map((status) => (
              <Kolom
                key={status}
                status={status}
                bugs={peta[status] ?? []}
                terlipat={terlipat[status] ?? false}
                disorot={kolomTersorot === status}
                onToggleLipat={() =>
                  setTerlipat((p) => ({ ...p, [status]: !p[status] }))
                }
                onMenu={(bug, e) => {
                  const r = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  setMenu({
                    bug,
                    atas: r.bottom + 4,
                    kiri: Math.min(r.right - 176, window.innerWidth - 184),
                  });
                }}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-ink-3">
          Gulir dengan wheel atau trackpad, seret area kosong untuk menggeser,
          atau gunakan tombol panah saat papan difokus.
        </p>
      </div>

            {/* Kartu salinan yang mengikuti kursor: miring 2 derajat dengan bayangan
          overlay. dropAnimation 220 ms supaya kartu meluncur ke posisi akhir. */}
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {aktifDrag && (
          <div
            className="shadow-overlay"
            style={{ transform: "rotate(2deg)", cursor: "grabbing" }}
          >
            <KartuIssue bug={aktifDrag} drag={false} onMenu={() => {}} />
          </div>
        )}
      </DragOverlay>

      <MenuPindahStatus
        terbuka={menu !== null}
        posisi={{ atas: menu?.atas ?? 0, kiri: menu?.kiri ?? 0 }}
        statusSekarang={menu?.bug.status ?? ""}
        onTutup={() => setMenu(null)}
        onPilih={pindahLewatMenu}
      />

      <DialogCatatan
        terbuka={dialogStatus !== null}
        judul={`Pindahkan ke ${namaStatus(dialogStatus?.status ?? "")}`}
        deskripsi={
          dialogStatus
            ? `${dialogStatus.bug.code ?? "Issue"}: ${dialogStatus.bug.title}`
            : undefined
        }
        onBatal={() => {
          if (dialogStatus) {
            const b = dialogStatus.bug;
            setPeta((p) => ({
              ...p,
              [dialogStatus.status]: p[dialogStatus.status].filter(
                (x) => x.id !== b.id
              ),
              [b.status]: [...p[b.status], b],
            }));
          }
          setDialogStatus(null);
        }}
        onSimpan={(catatan) => {
          const d = dialogStatus;
          setDialogStatus(null);
          if (!d) return;
          void jalankanPindah(d.bug, d.status, catatan, d.snapshot);
        }}
      />
    </DndContext>
  );
}

function cariBug(peta: PetaBug, id: string | number): BugKanban | null {
  for (const daftar of Object.values(peta)) {
    const ketemu = daftar.find((b) => String(b.id) === String(id));
    if (ketemu) return ketemu;
  }
  return null;
}

function Kolom({
  status,
  bugs,
  terlipat,
  disorot,
  onToggleLipat,
  onMenu,
}: {
  status: string;
  bugs: BugKanban[];
  terlipat: boolean;
  disorot: boolean;
  onToggleLipat: () => void;
  onMenu: (bug: BugKanban, e: React.MouseEvent) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `kolom:${status}` });
  const bolehLipat = BISA_LIPAT.includes(status);

  if (terlipat && bolehLipat) {
    return (
      <div
        ref={setNodeRef}
        className={`flex w-[48px] shrink-0 snap-start flex-col items-center gap-2 rounded-panel border border-line bg-surface-sunken pt-2 pb-2 ${
          disorot ? "ring-2 ring-accent" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className="h-1 w-5 rounded-full"
          style={{ background: warnaStatus(status) }}
        />
        <button
          type="button"
          onClick={onToggleLipat}
          aria-label={`Buka kolom ${namaStatus(status)}, ${bugs.length} issue`}
          className="text-[11px] font-bold text-ink-2 [writing-mode:vertical-rl] hover:text-accent"
        >
          {namaStatus(status)} ({bugs.length})
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      // Lebar fleksibel: mengisi ruang yang tersisa di antara 272 dan 340 px.
      className={`flex shrink-0 basis-[272px] grow-[272px] snap-start flex-col overflow-hidden rounded-panel border bg-surface-sunken transition-shadow duration-[var(--dur-fast)] ${
        disorot ? "border-accent" : "border-line"
      }`}
      style={{ maxWidth: "340px" }}
    >
      {/* Header Jira: garis atas berwarna status, judul, jumlah issue */}
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ background: warnaStatus(status) }}
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <h2 className="flex-1 truncate text-sm font-bold text-ink">
          {namaStatus(status)}
        </h2>
        <span className="num text-xs font-semibold text-ink-2">{bugs.length}</span>
        {bolehLipat && (
          <button
            type="button"
            onClick={onToggleLipat}
            aria-label={`Lipat kolom ${namaStatus(status)}`}
            className="rounded-control px-1 text-xs text-ink-3 hover:bg-line/50 hover:text-ink"
          >
            &gt;
          </button>
        )}
      </div>

      <div className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto p-2">
        {bugs.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-ink-3">
            Seret issue ke sini
          </p>
        ) : (
          bugs.map((bug) => (
            <KartuIssue key={bug.id} bug={bug} drag onMenu={onMenu} />
          ))
        )}
      </div>
    </div>
  );
}

function KartuIssue({
  bug,
  drag,
  onMenu,
}: {
  bug: BugKanban;
  drag: boolean;
  onMenu: (bug: BugKanban, e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: bug.id, disabled: !drag, data: { status: bug.status } });

  const { fg, label } = kelasSeverity(bug.severity);
  const prioritas = PRIORITAS_JIRA[bug.priority];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-kartu="true"
      style={{
        transform: CSS.Translate.toString(transform),
        transition: "transform 150ms ease",
      }}
      className={`flex items-stretch gap-2 rounded-control border border-line bg-surface p-2 shadow-raised transition-shadow duration-[var(--dur-fast)] ${
        // Kartu asli jadi placeholder pudar selama diseret; yang mengikut
        // kursor adalah salinan di DragOverlay.
        isDragging ? "opacity-40" : "hover:shadow-overlay"
      }`}
    >
      <SeverityRail severity={bug.severity} />

      <div className="min-w-0 flex-1">
        {/* Baris 1: kode issue dan umur */}
        <div className="flex items-center justify-between gap-2">
          <span className="code text-xs font-medium text-ink-2">
            {bug.code ?? "-"}
          </span>
          <span className="num shrink-0 text-[11px] text-ink-3">
            {formatUmur(bug.createdAt)}
          </span>
        </div>

        {/* Baris 2: summary maksimal dua baris */}
        <Link
          href={`/bugs/${bug.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="line-clamp-2 mt-0.5 block text-[13px] leading-[18px] font-semibold text-ink no-underline hover:text-accent hover:underline"
        >
          {bug.title}
        </Link>

        {/* Baris 3: severity, priority, assignee, menu */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase ${fg}`}
            title={`Severity ${label}`}
          >
            {label}
          </span>
          <span
            className="text-[10px] font-bold uppercase"
            style={{ color: prioritas?.warna }}
            title={`Priority ${prioritas?.label}`}
          >
            {prioritas?.label}
          </span>
          <span className="flex-1" />
          <AvatarInitials nama={bug.assigneeName} size={20} />
          {drag && (
            <button
              type="button"
              aria-label={`Pindahkan ${bug.code ?? "issue"}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onMenu(bug, e);
              }}
              className="rounded-control px-1 text-xs text-ink-3 hover:bg-bg hover:text-ink"
            >
              &hellip;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
