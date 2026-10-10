import { PageTransition } from "@/components/shell/PageTransition";

/**
 * Dipakai Next.js untuk membungkus tiap perpindahan halaman dengan animasi
 * masuk. Judul halaman tidak ikut bergerak karena animasi hanya pada pembungkus.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}