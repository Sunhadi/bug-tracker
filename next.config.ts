import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Batasi tracing ke folder proyek ini agar tidak ikut package-lock.json di folder induk
  outputFileTracingRoot: process.cwd(),

  // cacheComponents tidak dipakai: halaman ini banyak membaca session/cookies
  // dan query database, sehingga dynamic rendering sudah terjadi wajar.

  // Paket ini CommonJS dan tidak boleh di-bundle ke modul ESM route handler.
  serverExternalPackages: ["@vercel/blob"],

  // Vercel Hobby: batasi ukuran body server action
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;