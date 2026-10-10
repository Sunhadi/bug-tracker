import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __dbClient?: postgres.Sql;
  __db?: Database;
};

function createDb(): Database | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Jangan lempar di sini: halaman login dan route yang tidak butuh DB
    // harus tetap bisa dirender saat env belum diisi.
    return null;
  }

  const client =
    globalForDb.__dbClient ??
    postgres(connectionString, {
      max: process.env.NODE_ENV === "production" ? 1 : 10,
      // Neon: matikan statement timeout agar agregasi laporan tidak terputus
      idle_timeout: 20,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__dbClient = client;
  }

  const instance = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__db = instance;
  }
  return instance;
}

/**
 * Koneksi database. Mengembalikan null kalau DATABASE_URL belum diset,
 * supaya halaman non-DB tetap bisa dirender dan user melihat pesan jelas.
 */
export function getDb(): Database {
  const existing =
    process.env.NODE_ENV !== "production" ? globalForDb.__db : undefined;
  const instance = existing ?? createDb();
  if (!instance) {
    throw new Error(
      "DATABASE_URL belum diset. Isi di .env.local (lihat .env.example)."
    );
  }
  return instance;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});