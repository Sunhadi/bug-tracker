"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import type { ItemAnakNav } from "@/lib/nav";

/**
 * Submenu sidebar.
 *
 * Dua mode:
 * - expanded  : daftar anak diindent dengan garis vertikal tipis, tinggi
 *               dianimasikan lewat .lipat (grid-template-rows).
 * - collapsed : tidak dirender inline. Dipakai sebagai isi flyout, jadi teks
 *               dan ikonnya tampil penuh tanpa dipotong.
 */
export default function SidebarSubmenu({
  children,
  terbuka,
  untukFlyout = false,
  onPilih,
}: {
  children: ItemAnakNav[];
  /** Inline: menganimasikan buka/tutup. Diabaikan untuk flyout. */
  terbuka: boolean;
  untukFlyout?: boolean;
  onPilih?: () => void;
}) {
  const pathname = usePathname();

  if (untukFlyout) {
    return (
      <ul className="space-y-0.5">
        {children.map((anak) => (
          <li key={anak.href}>
            <SubmenuLink
              item={anak}
              pathname={pathname}
              onKlik={onPilih}
              kelas="flex items-center gap-2.5 rounded-control px-2 py-1.5 text-[13px]"
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="lipat" style={{ gridTemplateRows: terbuka ? "1fr" : "0fr" }}>
      <ul data-lipat-isi className="ml-5 border-l border-line pl-2">
        {children.map((anak) => (
          <li key={anak.href}>
            <SubmenuLink
              item={anak}
              pathname={pathname}
              kelas="flex items-center gap-2 rounded-control px-2 py-1.5 text-[13px]"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmenuLink({
  item,
  pathname,
  kelas,
  onKlik,
}: {
  item: ItemAnakNav;
  pathname: string;
  kelas: string;
  onKlik?: () => void;
}) {
  const aktif = pathname === item.href;

  return (
    <Link
      href={item.href}
      aria-current={aktif ? "page" : undefined}
      onClick={onKlik}
      title={item.label}
      className={`${kelas} sidebar-submenu-link truncate transition-colors duration-[var(--dur-fast)] ${
        aktif
          ? "bg-accent-soft font-semibold text-accent"
          : "text-ink-2 hover:bg-surface-hover hover:text-ink"
      }`}
    >
      <FontAwesomeIcon
        icon={item.icon}
        className="h-3.5! w-3.5! shrink-0 opacity-70"
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Panah buka/tutup submenu di mode expanded. */
export function TombolSubmenu({
  terbuka,
  label,
  onKlik,
}: {
  terbuka: boolean;
  label: string;
  onKlik: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onKlik}
      aria-expanded={terbuka}
      aria-label={`${terbuka ? "Tutup" : "Buka"} submenu ${label}`}
      className="btn flex h-7 w-6 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink"
    >
      <FontAwesomeIcon
        icon={faChevronDown}
        className={`h-3! w-3! transition-transform duration-[var(--dur-base)] ${
          terbuka ? "rotate-180" : "rotate-0"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
