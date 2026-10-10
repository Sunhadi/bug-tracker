"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ItemNav } from "@/lib/nav";
import SidebarSubmenu, { TombolSubmenu } from "./SidebarSubmenu";
import { FlyoutSamping, TooltipSamping } from "./PanelSamping";

/**
 * Satu item menu di sidebar.
 *
 * Mode expanded  : ikon w-5 rata tengah + label, gap 12 px, panah submenu,
 *                  dan anak submenu ditampilkan inline.
 * Mode collapsed : hanya ikon dalam tombol 40x40 di tengah. Item biasa
 *                  menampilkan tooltip, item bersubmenu menampilkan flyout.
 *                  Tidak ada huruf atau teks yang pernah tampil di mode ini.
 */

interface Props {
  item: ItemNav;
  aktif: boolean;
  ciut: boolean;
  /** Submenu sudah terbuka (dari localStorage atau rute yang sedang aktif). */
  submenuTerbuka: boolean;
  onToggleSubmenu: () => void;
}

export default function SidebarItem({
  item,
  aktif,
  ciut,
  submenuTerbuka,
  onToggleSubmenu,
}: Props) {
  const punyaSubmenu = Boolean(item.children?.length);

  if (ciut) {
    return (
      <CollapsedItem item={item} aktif={aktif} punyaSubmenu={punyaSubmenu} />
    );
  }

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={item.href}
          aria-current={aktif ? "page" : undefined}
          title={item.label}
          className={`sidebar-item group relative flex min-w-0 flex-1 items-center gap-3 rounded-control py-1.5 pr-1 pl-2 text-sm transition-colors duration-[var(--dur-hover)] ${
            aktif
              ? "bg-accent-soft font-semibold text-accent"
              : "font-medium text-ink-2 hover:bg-surface-hover hover:text-ink"
          }`}
        >
          {aktif && <BarAktif />}
          <Ikon item={item} />
          <span className="truncate">{item.label}</span>
        </Link>

        {punyaSubmenu && (
          <TombolSubmenu
            terbuka={submenuTerbuka}
            label={item.label}
            onKlik={onToggleSubmenu}
          />
        )}
      </div>

      {punyaSubmenu && (
        <SidebarSubmenu terbuka={submenuTerbuka}>
          {item.children!}
        </SidebarSubmenu>
      )}
    </li>
  );
}

/** Indikator bar biru 3 px di sisi kiri item aktif. */
function BarAktif() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
    />
  );
}

/** Ikon selebar 20 px supaya label selalu mulai di kolom yang sama. */
function Ikon({ item }: { item: ItemNav }) {
  return (
    <span
      aria-hidden="true"
      className="flex w-5 shrink-0 items-center justify-center"
    >
      <FontAwesomeIcon icon={item.icon} className="h-4! w-4!" />
    </span>
  );
}

/** Item dalam mode sidebar dikecilkan. */
function CollapsedItem({
  item,
  aktif,
  punyaSubmenu,
}: {
  item: ItemNav;
  aktif: boolean;
  punyaSubmenu: boolean;
}) {
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState(false);
  const [tertanam, setTertanam] = useState(false);
  const [fokus, setFokus] = useState(false);
  // Flyout hanya terbuka karena hover atau klik. Kalau ikut submenuTerbuka,
  // flyout akan menutupi isi halaman terus selama ada rute bulanan yang aktif.
  const terbuka = punyaSubmenu && (hover || tertanam);
  const tampilAktif = aktif || terbuka;

  function tutupFlyout() {
    setHover(false);
    setTertanam(false);
    triggerRef.current?.focus();
  }

  return (
    <li
      className="flex justify-center"
      // Flyout ikut Nutup begitu mouse Leave dari li. Flyout-nya sendiri
      // dirender sebagai anak li ini (walau posisinya fixed), jadi mouse
      // yang bergerak dari ikon ke flyout tidak memicu Leave.
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && terbuka) {
          e.stopPropagation();
          tutupFlyout();
        }
      }}
    >
      <Link
        ref={triggerRef}
        href={item.href}
        aria-current={aktif ? "page" : undefined}
        aria-expanded={punyaSubmenu ? terbuka : undefined}
        aria-label={item.label}
        title={item.label}
        onClick={() => {
          if (punyaSubmenu) setTertanam((t) => !t);
        }}
        onFocus={() => setFokus(true)}
        onBlur={() => setFokus(false)}
        className={`sidebar-item relative flex h-10 w-10 items-center justify-center rounded-control transition-colors duration-[var(--dur-hover)] ${
          tampilAktif
            ? "bg-accent-soft text-accent"
            : "text-ink-2 hover:bg-surface-hover hover:text-ink"
        }`}
      >
        {aktif && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
          />
        )}
        <FontAwesomeIcon icon={item.icon} className="h-4! w-4!" />
      </Link>

      {punyaSubmenu ? (
        <FlyoutSamping
          anchorRef={triggerRef}
          label={item.label}
          terbuka={terbuka}
        >
          <SidebarSubmenu
            terbuka
            untukFlyout
            onPilih={() => setTertanam(false)}
          >
            {item.children!}
          </SidebarSubmenu>
        </FlyoutSamping>
      ) : (
        <TooltipSamping
          anchorRef={triggerRef}
          label={item.label}
          terbuka={hover || fokus}
        />
      )}
    </li>
  );
}