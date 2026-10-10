"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CircleHelp,
  FolderKanban,
  LogOut,
  Menu,
  Plus,
  Search,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui";
import { motion } from "motion/react";
import { popover } from "@/lib/motion";

/**
 * Top bar 56 px: tombol sidebar, logo, menu project, menu laporan, tombol
 * Buat, kolom cari di tengah, lalu notifikasi, bantuan, dan menu profil.
 */
export function TopBar({
  projects,
  projectId,
  onProject,
  onOpenCommand,
  onOpenShortcuts,
  onToggleSidebar,
  user,
}: {
  projects: { id: number; name: string }[];
  projectId: string;
  onProject: (id: string) => void;
  onOpenCommand: () => void;
  onOpenShortcuts: () => void;
  onToggleSidebar: () => void;
  user: { name: string; role: string };
}) {
  const router = useRouter();
  const [menuProject, setMenuProject] = useState(false);
  const [menuLaporan, setMenuLaporan] = useState(false);
  const [menuProfil, setMenuProfil] = useState(false);
  const cariRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const laporanRef = useRef<HTMLDivElement>(null);
  const profilRef = useRef<HTMLDivElement>(null);

  const projectAktif =
    projects.find((p) => String(p.id) === projectId) ?? null;

  // Tutup menu saat klik di luar.
  useEffect(() => {
    function onKlik(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (projectRef.current && !projectRef.current.contains(t))
        setMenuProject(false);
      if (laporanRef.current && !laporanRef.current.contains(t))
        setMenuLaporan(false);
      if (profilRef.current && !profilRef.current.contains(t))
        setMenuProfil(false);
    }
    document.addEventListener("mousedown", onKlik);
    return () => document.removeEventListener("mousedown", onKlik);
  }, []);

  // Pintasan: Cmd/Ctrl+K palet, "/" ke kolom cari, "C" buat issue.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const mengetik =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenCommand();
        return;
      }
      if (e.key === "/" && !mengetik) {
        e.preventDefault();
        cariRef.current?.focus();
        return;
      }
      if (e.key.toLowerCase() === "c" && !mengetik && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/bugs/new");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenCommand, router]);

  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="app-topbar flex h-[var(--topbar-h)] shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
      <IconButton label="Buka navigasi" onClick={onToggleSidebar} className="xl:hidden">
        <Menu size={16} />
      </IconButton>

      <Link href="/dashboard" className="hidden items-center gap-2 sm:flex">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-control bg-accent text-white"
        >
          <FolderKanban size={14} />
        </span>
        <span className="text-sm font-bold text-ink">Bug Tracker</span>
      </Link>

      {/* Menu project */}
      <div ref={projectRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuProject((v) => !v)}
          aria-expanded={menuProject}
          aria-haspopup="menu"
          className="flex h-8 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
        >
          <span className="max-w-[140px] truncate">
            {projectAktif?.name ?? "Semua project"}
          </span>
          <span aria-hidden="true" className="text-ink-3">
            ▾
          </span>
        </button>
        {menuProject && (
          <motion.div
            {...popover}
            role="menu"
            className="pop absolute top-9 left-0 z-40 min-w-[200px] rounded-pop border border-line bg-surface py-1"
            style={{ transformOrigin: "top left" }}
          >
            <MenuItem
              label="Semua project"
              aktif={projectId === ""}
              onClick={() => {
                onProject("");
                setMenuProject(false);
              }}
            />
            <div className="my-1 border-t border-line" />
            {projects.map((p) => (
              <MenuItem
                key={p.id}
                label={p.name}
                aktif={projectId === String(p.id)}
                onClick={() => {
                  onProject(String(p.id));
                  setMenuProject(false);
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Menu laporan */}
      <div ref={laporanRef} className="relative hidden md:block">
        <button
          type="button"
          onClick={() => setMenuLaporan((v) => !v)}
          aria-expanded={menuLaporan}
          aria-haspopup="menu"
          className="flex h-8 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
        >
          Laporan
          <span aria-hidden="true" className="text-ink-3">
            ▾
          </span>
        </button>
        {menuLaporan && (
          <motion.div
            {...popover}
            role="menu"
            className="pop absolute top-9 left-0 z-40 min-w-[200px] rounded-pop border border-line bg-surface py-1"
            style={{ transformOrigin: "top left" }}
          >
            <MenuLink href="/laporan/harian" onClick={() => setMenuLaporan(false)}>
              Harian
            </MenuLink>
            <MenuLink
              href="/laporan/bulanan/kategori"
              onClick={() => setMenuLaporan(false)}
            >
              Bulanan
            </MenuLink>
            <MenuLink
              href="/laporan/trend"
              onClick={() => setMenuLaporan(false)}
            >
              Trend
            </MenuLink>
          </motion.div>
        )}
      </div>

      <Button
        variant="primary"
        onClick={() => router.push("/bugs/new")}
        className="hidden sm:inline-flex"
      >
        <Plus size={14} aria-hidden="true" />
        Buat
      </Button>

      {/* Kolom cari */}
      <div className="mx-auto flex w-full max-w-[560px] items-center">
        <div className="relative w-full">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-3"
          />
          <input
            ref={cariRef}
            type="search"
            readOnly
            onClick={onOpenCommand}
            placeholder="Cari issue, halaman, atau aksi"
            aria-label="Cari issue, halaman, atau aksi"
            className="h-8 w-full rounded-control border border-line-strong bg-surface pr-16 pl-7 text-sm text-ink transition-[width] duration-[var(--dur-base)] ease-[var(--ease-standard)] placeholder:text-ink-3 focus:border-accent focus:outline-none hover:border-ink-3"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-control border border-line px-1 text-[10px] text-ink-3">
            Ctrl K
          </kbd>
        </div>
      </div>

      <IconButton label="Notifikasi">
        <Bell size={16} />
      </IconButton>
      <IconButton label="Daftar pintasan" onClick={onOpenShortcuts}>
        <CircleHelp size={16} />
      </IconButton>

      {/* Menu profil */}
      <div ref={profilRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuProfil((v) => !v)}
          aria-expanded={menuProfil}
          aria-haspopup="menu"
          aria-label="Menu profil"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent transition-colors duration-[var(--dur-fast)] hover:brightness-95"
        >
          {user.name.slice(0, 1).toUpperCase()}
        </button>
        {menuProfil && (
          <motion.div
            {...popover}
            role="menu"
            className="pop absolute top-10 right-0 z-40 min-w-[200px] rounded-pop border border-line bg-surface py-1"
            style={{ transformOrigin: "top right" }}
          >
            <div className="border-b border-line px-3 py-2">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-3 capitalize">{user.role}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => void keluar()}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
            >
              <LogOut size={14} aria-hidden="true" />
              Keluar
            </button>
          </motion.div>
        )}
      </div>
    </header>
  );
}

function MenuItem({
  label,
  aktif,
  onClick,
}: {
  label: string;
  aktif: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={aktif}
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left text-sm transition-colors duration-[var(--dur-fast)] ${
        aktif ? "font-semibold text-accent" : "text-ink-2 hover:bg-surface-hover hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-3 py-1.5 text-sm text-ink-2 no-underline transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
    >
      {children}
    </Link>
  );
}