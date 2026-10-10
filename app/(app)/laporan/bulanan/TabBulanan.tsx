"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { DURASI, ease } from "@/lib/motion";

/**
 * Tab laporan bulanan dengan garis bawah meluncur.
 * Memakai searchParams apa adanya supaya filter bulan dan project ikut
 * terbawa saat berpindah tab.
 */

const TAB = [
  { slug: "kategori", label: "Kategori Bug" },
  { slug: "klien", label: "Bug Klien" },
  { slug: "scope", label: "Scope Tambahan" },
];

export default function TabBulanan() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const akhir = qs ? `?${qs}` : "";
  const aktif = pathname.split("/").filter(Boolean).pop() ?? "kategori";

  return (
    <nav aria-label="Jenis laporan" className="border-b border-line">
      <ul className="flex gap-1">
        {TAB.map((t) => {
          const on = aktif === t.slug;
          return (
            <li key={t.slug}>
              <Link
                href={`/laporan/bulanan/${t.slug}${akhir}`}
                aria-current={on ? "page" : undefined}
                className={`relative block px-3 py-2 text-sm font-semibold transition-colors duration-[var(--dur-fast)] ${
                  on ? "text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {t.label}
                {on && (
                  <motion.span
                    layoutId="tab-bulanan"
                    className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-accent"
                    transition={{ duration: DURASI.base, ease: ease.out }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}