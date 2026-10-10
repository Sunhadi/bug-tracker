"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Bungkus aplikasi dengan MotionConfig supaya animasi menghormati
 * preferensi "kurangi gerakan" di sistem operasi, dan satu set durasi
 * dasar berlaku di seluruh aplikasi.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </MotionConfig>
  );
}