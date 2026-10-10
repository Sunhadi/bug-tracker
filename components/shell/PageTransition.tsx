"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { fadeUp } from "@/lib/motion";

/**
 * Transisi pindah halaman. Disebut sebagai template.tsx supaya React
 * me-remountnya tiap kali rute berpindah.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div key={pathname} {...fadeUp}>
      {children}
    </motion.div>
  );
}