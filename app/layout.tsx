import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// CSS Font Awesome hanya untuk ikon SVG; tidak ada webfont yang diunduh.
import "@fortawesome/fontawesome-svg-core/styles.css";
import "@/lib/fontawesome";

// Di-host sendiri oleh next/font, tidak diambil dari Google saat runtime.
// JetBrains Mono dihapus: key issue memakai font UI 12 px bobot 500.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bug Tracker",
  description: "Alat catat dan pantau bug untuk tester",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning di <html> hanya untuk skrip pihak ketiga
    // (extension browser) yang menyuntik atribut ke elemen ini sebelum React
    // memuat. Cakupannya satu tingkat, mismatch di dalam tree tetap dilaporkan.
    <html lang="id" suppressHydrationWarning className={`${inter.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}