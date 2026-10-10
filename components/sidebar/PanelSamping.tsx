"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Panel yang muncul di samping sidebar (tooltip nama menu dan flyout submenu).
 *
 * Pakai position fixed, bukan absolute, supaya tidak ikut terpotong oleh
 * `overflow-x-hidden` pada wadah menu. Posisi diukur ulang saat panel dibuka,
 * saat jendela digeser, dan saat menu di-scroll.
 */

const JARAK = 8;
const MARGIN = 8;

interface Kotak {
  top: number;
  left: number;
}

function kosong(): Kotak {
  return { top: -9999, left: -9999 };
}

/**
 * Hitung posisi panel di sebelah kanan anchor, disejajarkan tengah secara
 * vertikal dan dijaga tetap di dalam viewport.
 */
function hitungPosisi(
  anchor: HTMLElement | null,
  panel: HTMLElement | null
): Kotak {
  if (!anchor || !panel) return kosong();
  const a = anchor.getBoundingClientRect();
  const p = panel.getBoundingClientRect();

  const kiri = a.right + JARAK;
  // Kalau tidak cukup ruang di kanan (misal di tepi layar), balik ke kiri.
  const ruangKanan = window.innerWidth - kiri;
  const finalKiri =
    ruangKanan > p.width + MARGIN
      ? kiri
      : Math.max(MARGIN, a.left - JARAK - p.width);

  let atas = a.top + a.height / 2 - p.height / 2;
  atas = Math.max(MARGIN, Math.min(atas, window.innerHeight - p.height - MARGIN));

  return { top: Math.round(atas), left: Math.round(finalKiri) };
}

/** Pasang listener posisi selama panel terbuka. */
function usePosisiPanel(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLDivElement | null>,
  terbuka: boolean
): Kotak {
  const [kotak, setKotak] = useState<Kotak>(kosong);

  const ukur = useCallback(() => {
    setKotak(hitungPosisi(anchorRef.current, panelRef.current));
  }, [anchorRef, panelRef]);

  useEffect(() => {
    if (!terbuka) return;
    const raf = requestAnimationFrame(ukur);
    window.addEventListener("resize", ukur);
    window.addEventListener("scroll", ukur, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", ukur);
      window.removeEventListener("scroll", ukur, true);
    };
  }, [terbuka, ukur]);

  return kotak;
}

const gayaPanel =
  "pointer-events-none fixed z-50 rounded-control border border-line bg-surface shadow-[var(--shadow-overlay)]";

/** Tooltip nama menu, muncul di kanan saat hover atau fokus keyboard. */
export function TooltipSamping({
  anchorRef,
  label,
  terbuka,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  terbuka: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const kotak = usePosisiPanel(anchorRef, panelRef, terbuka);

  if (!terbuka) return null;

  return (
    <div
      ref={panelRef}
      role="tooltip"
      className={`${gayaPanel} panel-samping-muncul px-2 py-1 text-xs font-medium whitespace-nowrap text-ink`}
      style={{ top: kotak.top, left: kotak.left }}
    >
      {label}
    </div>
  );
}

/**
 * Flyout submenu. Berisi daftar link, jadi harus bisa difokus dan dinavigasi
 * dengan Tab. Elemennya diletakkan tepat setelah pemicunya di DOM supaya
 * urutan Tab mengikuti urutan visual.
 *
 * Role-nya group, bukan menu: isinya link navigasi biasa dan tidak ada
 * navigasi dengan panah, jadi claiming role="menu" akan menjanjikan
 * perilaku yang tidak ada.
 */
export function FlyoutSamping({
  anchorRef,
  label,
  terbuka,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  terbuka: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const kotak = usePosisiPanel(anchorRef, panelRef, terbuka);

  if (!terbuka) return null;

  return (
    <div
      ref={panelRef}
      role="group"
      aria-label={label}
      className={`${gayaPanel} pointer-events-auto panel-samping-muncul min-w-[184px] p-1`}
      style={{ top: kotak.top, left: kotak.left }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          anchorRef.current?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}