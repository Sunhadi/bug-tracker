"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { COOKIE_PROJECT } from "@/lib/constants";
import { PINTAKAN_G, JEDA_G_MS } from "@/lib/nav";
import { TopBar } from "./shell/TopBar";
import { Sidebar } from "./sidebar/Sidebar";
import { CommandPalette } from "./shell/CommandPalette";
import { ShortcutsDialog } from "./shell/ShortcutsDialog";

interface ProjectContextValue {
  /** Kosong berarti semua project. */
  projectId: string;
  projects: { id: number; name: string }[];
  setProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/** Project yang sedang dipilih, berlaku di semua halaman. */
export function useProjectGlobal(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectGlobal harus dipakai di dalam AppShell");
  }
  return ctx;
}

/**
 * Kerangka aplikasi: top bar dan sidebar proyek, konten di bawahnya.
 * Memilih project menyimpan pilihan ke cookie supaya berlaku global.
 */
export function AppShell({
  children,
  projects,
  initialProjectId,
  user,
}: {
  children: ReactNode;
  projects: { id: number; name: string }[];
  initialProjectId: string;
  user: { name: string; role: string };
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [drawerTerbuka, setDrawerTerbuka] = useState(false);
  const [paletTerbuka, setPaletTerbuka] = useState(false);
  const [pintasanTerbuka, setPintasanTerbuka] = useState(false);
  const gBaru = useRef(0);

  // Tidak ada efek yang menyinkronkan state dari initialProjectId: layout
  // memberi key yang berubah saat cookie project berubah, jadi komponen ini
  // sudah me-remount dengan nilai baru.

  function onProject(id: string) {
    setProjectId(id);
    document.cookie = `${COOKIE_PROJECT}=${id}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  // Pintasan G lalu huruf, "?" untuk daftar pintasan.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const mengetik =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (mengetik || e.metaKey || e.ctrlKey || e.altKey) return;

      const sekarang = Date.now();

      if (e.key === "?") {
        e.preventDefault();
        setPintasanTerbuka(true);
        return;
      }

      // G memulai rangkaian; huruf berikutnya dibaca sebagai tujuan.
      if (e.key.toLowerCase() === "g") {
        gBaru.current = sekarang;
        return;
      }
      if (sekarang - gBaru.current < JEDA_G_MS) {
        const tujuan = PINTAKAN_G[e.key.toLowerCase()];
        if (tujuan) {
          e.preventDefault();
          window.location.href = tujuan;
          return;
        }
      }
      gBaru.current = 0;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projectName =
    projects.find((p) => String(p.id) === projectId)?.name ?? null;

  const sidebar = (
    <Sidebar
      projects={projects}
      projectId={projectId}
      projectName={projectName}
      onOpenCommand={() => setPaletTerbuka(true)}
    />
  );

  // Di drawer layar kecil sidebar selalu tampil lengkap, mengikuti preferensi
  // ciut yang tersimpan akan membuat isinya tidak terbaca di layar sempit.
  const sidebarLebar = (
    <Sidebar
      projects={projects}
      projectId={projectId}
      projectName={projectName}
      onOpenCommand={() => setPaletTerbuka(true)}
      selaluLebar
    />
  );

  return (
    <ProjectContext.Provider value={{ projectId, projects, setProject: onProject }}>
      <div className="app-shell flex min-h-screen flex-col bg-bg">
        <TopBar
          projects={projects}
          projectId={projectId}
          onProject={onProject}
          onOpenCommand={() => setPaletTerbuka(true)}
          onOpenShortcuts={() => setPintasanTerbuka(true)}
          onToggleSidebar={() => setDrawerTerbuka(true)}
          user={user}
        />

        <div className="app-navigasi flex min-h-0 flex-1">
          {/* Sidebar tetap di layar lebar */}
          <div className="sticky top-0 hidden h-[calc(100vh-var(--topbar-h))] xl:block">
            {sidebar}
          </div>

          {/* Di bawah itu sidebar jadi drawer dari kiri */}
          {drawerTerbuka && (
            <div className="fixed inset-0 z-40 xl:hidden">
              <div
                className="absolute inset-0 bg-ink/50"
                onClick={() => setDrawerTerbuka(false)}
                aria-hidden="true"
              />
              <div className="relative h-full">
                {sidebarLebar}
              </div>
            </div>
          )}

          <main className="app-konten min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>

        <CommandPalette
          terbuka={paletTerbuka}
          onTutup={() => setPaletTerbuka(false)}
        />
        <ShortcutsDialog
          terbuka={pintasanTerbuka}
          onTutup={() => setPintasanTerbuka(false)}
        />
      </div>
    </ProjectContext.Provider>
  );
}