"use client";

import type { GrupNav } from "@/lib/nav";
import SidebarItem from "./SidebarItem";

/**
 * Satu grup menu (Perencanaan, Pengujian, Laporan, Pengaturan).
 *
 * Saat sidebar dikecilkan, judul grup diganti garis pemisah tipis supaya
 * masih terlihat batas antar grup tanpa memakan ruang ikon.
 */
export default function SidebarGroup({
  grup,
  aktif,
  ciut,
  submenuTerbuka,
  onToggleSubmenu,
}: {
  grup: GrupNav;
  /** href item yang sedang aktif. */
  aktif: string | null;
  ciut: boolean;
  /** href item induk yang submenunya sedang terbuka. */
  submenuTerbuka: string | null;
  onToggleSubmenu: (href: string) => void;
}) {
  return (
    <div className={ciut ? "mb-2 last:mb-0" : "mb-4 last:mb-0"}>
      {ciut ? (
        <div
          aria-hidden="true"
          className="mx-auto mb-2 h-px w-6 bg-line"
        />
      ) : (
        <p className="mb-1 px-2 text-[11px] font-bold tracking-wide text-ink-3 uppercase">
          {grup.judul}
        </p>
      )}

      <ul className={ciut ? "space-y-1" : "space-y-0.5"}>
        {grup.item.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            aktif={aktif === item.href}
            ciut={ciut}
            submenuTerbuka={submenuTerbuka === item.href}
            onToggleSubmenu={() => onToggleSubmenu(item.href)}
          />
        ))}
      </ul>
    </div>
  );
}