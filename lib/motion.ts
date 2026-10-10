/**
 * Varian animasi yang dipakai ulang. Semua durasi dan easing memakai token
 * gerak dari globals.css supaya tidak ada angka yang ditulis tangan.
 * Sesuai bug-tracker-redesign (1).md bagian 4.
 */

export const ease = {
  out: [0.2, 0, 0, 1],
  in: [0.4, 0, 1, 1],
  standard: [0.4, 0, 0.2, 1],
} as const;

export const DURASI = {
  instant: 0.08,
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURASI.base, ease: ease.out },
  },
  exit: { opacity: 0, transition: { duration: DURASI.fast, ease: ease.in } },
};

/** Dropdown, select, menu, tooltip. */
export const popover = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.14, ease: ease.out },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.1, ease: ease.in },
  },
};

/** Panel samping dari kanan. */
export const slideOver = {
  initial: { x: 48, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: ease.out },
  },
  exit: { x: 48, opacity: 0, transition: { duration: 0.2, ease: ease.in } },
};

export const dialog = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: ease.out },
  },
  exit: { opacity: 0, y: 4, transition: { duration: 0.14, ease: ease.in } },
};

export const overlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURASI.fast } },
  exit: { opacity: 0, transition: { duration: DURASI.fast } },
};

/** Jeda masuk bertahap. Dibatasi 8 supaya tidak terlalu lambat. */
export const stagger = (i: number) => ({
  delay: Math.min(i, 8) * 0.02,
});

/** Kartu Board yang sedang diseret. */
export const seret = {
  rotate: 2,
  cursor: "grabbing" as const,
  boxShadow: "var(--shadow-overlay)",
};

export const seretTempat = { opacity: 0.4 };

/** Kolom Board yang menjadi tujuan drop. */
export const kolomTujuan = {
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};