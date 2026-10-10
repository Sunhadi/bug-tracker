import { defineConfig } from "drizzle-kit";

// drizzle-kit tidak memuat .env.local secara otomatis, jadi kita baca manual
// lewat process.loadEnvFile() (Node 20.12+).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local belum ada — andalkan env dari Vercel/CI
}

const url = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    // Wajib ada untuk drizzle-kit push/migrate/studio
    url: url ?? "postgresql://postgres:postgres@localhost:5432/bug_tracker",
  },
});