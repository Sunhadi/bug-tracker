/**
 * Definisi navigasi dan pintasan keyboard.
 * Dipakai sidebar, top bar, dan command palette supaya tidak ada daftar
 * rute yang ditulis ulang di beberapa tempat.
 *
 * Setiap item wajib punya icon supaya sidebar yang dikecilkan tetap bisa
 * dibaca lewat ikon, bukan huruf pertama label (huruf itu ambigu:
 * "Board" dan "Bulanan" sama-sama B).
 */

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBug,
  faCalendarDay,
  faCalendarDays,
  faChartLine,
  faFlask,
  faGear,
  faLayerGroup,
  faListCheck,
  faTableCells,
  faTableColumns,
  faTags,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";

export interface ItemAnakNav {
  href: string;
  label: string;
  icon: IconDefinition;
}

export interface ItemNav {
  href: string;
  label: string;
  icon: IconDefinition;
  /** Rute anak untuk submenu, contoh /laporan/bulanan/* */
  children?: ItemAnakNav[];
}

export interface GrupNav {
  judul: string;
  item: ItemNav[];
}

export const NAVIGASI: GrupNav[] = [
  {
    judul: "Perencanaan",
    item: [
      { href: "/dashboard", label: "Ringkasan", icon: faTableColumns },
      { href: "/bugs", label: "Daftar", icon: faListCheck },
      { href: "/bugs/board", label: "Board", icon: faTableCells },
    ],
  },
  {
    judul: "Pengujian",
    item: [{ href: "/test-cases", label: "Test case", icon: faFlask }],
  },
  {
    judul: "Laporan",
    item: [
      { href: "/laporan/harian", label: "Harian", icon: faCalendarDay },
      {
        href: "/laporan/bulanan",
        label: "Bulanan",
        icon: faCalendarDays,
        children: [
          { href: "/laporan/bulanan/kategori", label: "Kategori Bug", icon: faTags },
          { href: "/laporan/bulanan/klien", label: "Bug Klien", icon: faUserTie },
          {
            href: "/laporan/bulanan/scope",
            label: "Scope Tambahan",
            icon: faLayerGroup,
          },
        ],
      },
      { href: "/laporan/trend", label: "Trend 12 bulan", icon: faChartLine },
    ],
  },
  {
    judul: "Pengaturan",
    item: [{ href: "/pengaturan/kategori", label: "Kategori bug", icon: faGear }],
  },
];

/** Ikon untuk logo di header sidebar. */
export const IKON_APLIKASI = faBug;

/**
 * Sidebar hanya boleh menandai satu item aktif. Aturan: dari semua item yang
 * cocok dengan pathname, ambil yang href-nya paling panjang (paling spesifik).
 * Tanpa ini "/bugs" dan "/bugs/board" jadi aktif bersamaan.
 */
export function itemAktif(pathname: string): string | null {
  let terbaik: string | null = null;
  for (const grup of NAVIGASI) {
    for (const item of grup.item) {
      const cocok =
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
      if (cocok && (!terbaik || item.href.length > terbaik.length)) {
        terbaik = item.href;
      }
    }
  }
  return terbaik;
}

export function grupTerbuka(pathname: string, kunci: string): boolean {
  const grup = NAVIGASI.find((g) => g.item.some((i) => i.href === kunci));
  if (!grup) return false;
  return grup.item.some(
    (i) =>
      i.href === kunci &&
      (pathname === kunci || pathname.startsWith(kunci + "/"))
  );
}

// ---------------------------------------------------------------- pintasan

export type KonteksPintasan = "global" | "daftar" | "issue";

export interface Pintasan {
  kunci: string[];
  label: string;
  konteks: KonteksPintasan;
  jalankan?: () => void;
}

/** Huruf untuk menu G lalu huruf, mis. G lalu D untuk Dashboard. */
export const PINTAKAN_G: Record<string, string> = {
  d: "/dashboard",
  i: "/bugs",
  b: "/bugs/board",
  l: "/laporan/harian",
  m: "/laporan/bulanan/kategori",
  t: "/laporan/trend",
};

/**
 * Kunci ditekan dalam waktu 1,2 detik setelah G akan dianggap urutan
 * "lalu", bukan dua pintasan terpisah.
 */
export const JEDA_G_MS = 1200;