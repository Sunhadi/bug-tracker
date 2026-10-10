"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleLeft,
  faAngleRight,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import { NAVIGASI, IKON_APLIKASI, itemAktif } from "@/lib/nav";
import { useNilaiLocalStorage } from "@/lib/useNilaiLocalStorage";
import SidebarGroup from "./SidebarGroup";

/**
 * Cari item yang submenunya harus terbuka: yang punya anak dan pathname-nya
 * sedang berada di bawah induknya.
 */
function hitungSubmenuTerbuka(pathname: string, tersimpanTerbuka: boolean) {
  for (const grup of NAVIGASI) {
    for (const item of grup.item) {
      if (item.children && pathname.startsWith(item.href + "/")) {
        return item.href;
      }
    }
  }
  // Tidak ada rute anak yang aktif, jadi andalkan preferensi yang disimpan.
  if (!tersimpanTerbuka) return null;
  const denganSubmenu = NAVIGASI.flatMap((g) => g.item).filter(
    (i) => i.children
  );
  return denganSubmenu[0]?.href ?? null;
}

/**
 * Sidebar proyek.
 *
 * Lebar 240 px saat terbuka dan 64 px saat dikecilkan, pilihan disimpan di
 * localStorage dan dibaca lewat external store supaya tidak ada hydration
 * mismatch (lihat lib/useNilaiLocalStorage.ts). Hanya satu item aktif
 * (lihat itemAktif di lib/nav.ts).
 *
 * Mode dikecilkan menampilkan ikon saja, tidak pernah huruf atau teks.
 * Item bersubmenu membuka flyout di sisi kanan; item biasa menampilkan
 * tooltip nama menu.
 */
export function Sidebar({
  projects,
  projectId,
  projectName,
  onOpenCommand,
  selaluLebar = false,
}: {
  projects: { id: number; name: string }[];
  projectId: string;
  projectName: string | null;
  onOpenCommand?: () => void;
  /**
   * Drawer di layar kecil selalu tampil lengkap, apa pun preferensi
   * ciut yang tersimpan di desktop.
   */
  selaluLebar?: boolean;
}) {
  const pathname = usePathname();
  const [ciutTeks, setCiutTeks] = useNilaiLocalStorage("sidebar_ciut", "0");
  const [bulanTeks, setBulanTeks] = useNilaiLocalStorage("sidebar_bulan", "0");

  const ciut = selaluLebar ? false : ciutTeks === "1";
  const aktif = itemAktif(pathname);

  // Submenu terbuka kalau disimpan di localStorage, atau kalau pathname
  // sedang berada di salah satu rute anaknya.
  const submenuTerbuka = hitungSubmenuTerbuka(pathname, bulanTeks === "1");

  function toggleCiut() {
    setCiutTeks(ciut ? "0" : "1");
  }

  function toggleSubmenu(href: string) {
    setBulanTeks(submenuTerbuka === href ? "0" : "1");
  }

  const lebar = ciut
    ? "var(--sidebar-w-collapsed)"
    : "var(--sidebar-w)";

  return (
    <nav
      aria-label="Navigasi proyek"
      style={{ width: lebar }}
      data-ciut={ciut ? "true" : "false"}
      className="app-sidebar flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-[var(--dur-sidebar)] ease-[var(--ease-in-out)]"
    >
      {/* Kepala */}
      <div
        className={`flex h-[var(--topbar-h)] shrink-0 items-center border-b border-line ${
          ciut ? "justify-center px-2" : "gap-2 px-3"
        }`}
      >
        <Link
          href="/dashboard"
          aria-label="Bug Tracker"
          title="Bug Tracker"
          className={`flex items-center rounded-control text-accent ${
            ciut ? "h-10 w-10 justify-center" : "gap-2"
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-accent text-white"
          >
            <FontAwesomeIcon icon={IKON_APLIKASI} className="h-3.5! w-3.5!" />
          </span>
          {!ciut && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                Bug Tracker
              </span>
              <span className="block truncate text-[11px] text-ink-3">
                {projectId
                  ? (projectName ?? "Proyek")
                  : `${projects.length} project`}
              </span>
            </span>
          )}
        </Link>

        {!ciut && (
          <button
            type="button"
            onClick={toggleCiut}
            aria-label="Ciutkan sidebar"
            title="Ciutkan sidebar"
            className="btn flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
          >
            <FontAwesomeIcon icon={faAngleLeft} className="h-3! w-3!" />
          </button>
        )}
      </div>

      {ciut && (
        <div className="flex shrink-0 justify-center py-2">
          <button
            type="button"
            onClick={toggleCiut}
            aria-label="Perluas sidebar"
            title="Perluas sidebar"
            className="btn flex h-8 w-8 items-center justify-center rounded-control text-ink-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
          >
            <FontAwesomeIcon icon={faAngleRight} className="h-3! w-3!" />
          </button>
        </div>
      )}

      {/* Daftar menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {/* Key berganti saat mode berubah supaya state flyout dan submenu
            yang menyangkut ikut dibersihkan. */}
        <div key={ciut ? "ciut" : "lebar"} className="px-2">
          {NAVIGASI.map((grup) => (
            <SidebarGroup
              key={grup.judul}
              grup={grup}
              aktif={aktif}
              ciut={ciut}
              submenuTerbuka={submenuTerbuka}
              onToggleSubmenu={toggleSubmenu}
            />
          ))}
        </div>
      </div>

      {/* Pencarian: kotak penuh saat terbuka, tombol ikon saat dikecilkan. */}
      {onOpenCommand && (
        <div className="shrink-0 border-t border-line p-2">
          {ciut ? (
            <button
              type="button"
              onClick={onOpenCommand}
              aria-label="Cari (Ctrl K)"
              title="Cari (Ctrl K)"
              className="btn mx-auto flex h-10 w-10 items-center justify-center rounded-control text-ink-2 transition-colors duration-[var(--dur-hover)] hover:bg-surface-hover hover:text-ink"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4! w-4!" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCommand}
              className="flex w-full items-center justify-between rounded-control border border-line px-2 py-1.5 text-xs font-medium text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="h-3! w-3!"
                  aria-hidden="true"
                />
                Cari
              </span>
              <kbd className="rounded-control border border-line px-1 text-[10px] text-ink-3">
                Ctrl K
              </kbd>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
