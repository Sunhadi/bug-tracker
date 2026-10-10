/**
 * Seed laporan bulanan dari workbook Rekap Bug Mazda.
 * Jalankan: npm run db:seed
 *
 * Sumber angka: db/seed-data/rekap-bug-mazda.xlsx
 *
 * Isi seed:
 * - Kategori bug beserta warna
 * - User untuk setiap PIC dari sheet Daftar Bug
 * - Modul dari kolom Area / Modul
 * - 29 item analisis (13 issue Jira + 16 temuan tambahan)
 * - 10 issue Jira yang dikeluarkan dari analisis
 * - 8 permintaan scope tambahan
 *
 * Seed ini idempoten: data proyek "Mazda ALC" dihapus lalu dibuat ulang,
 * jadi aman dijalankan berkali-kali.
 */
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import * as schema from "./schema.ts";
import {
  bacaMazda,
  KATEGORI_AWAL,
  SEVERITY_DARI_PRIORITY,
} from "../lib/import-mazda.ts";

const PATH_MAZDA = "db/seed-data/rekap-bug-mazda.xlsx";
const NAMA_PROYEK = "Mazda ALC";
/** Bulan yang dipakai sebagai data contoh laporan bulanan. */
const BULAN_LAPORAN = "2026-08";

/** Tanggal selesai kalau sheet tidak menyebutkannya. */
function selesaiPakai(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 16).replace("T", " ") + "+07";
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diset di .env.local / environment");
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  // ============ 1. Admin ============
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  let admin = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.email, adminEmail),
  });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    [admin] = await db
      .insert(schema.users)
      .values({
        name: process.env.SEED_ADMIN_NAME ?? "Admin",
        email: adminEmail,
        passwordHash,
        role: "admin",
      })
      .returning();
    console.log(`Admin dibuat: ${admin.name} (id=${admin.id})`);
  } else {
    console.log(`Admin sudah ada: ${admin.email} (id=${admin.id})`);
  }

  // ============ 2. Baca workbook Mazda ============
  const mz = await bacaMazda(PATH_MAZDA);
  console.log(
    `\nWorkbook: ${mz.jira.length} issue Jira, ${mz.item.length} item analisis, ` +
      `${mz.scope.length} request scope, ${mz.jumlahDikecualikan} dikecualikan`
  );

  // ============ 3. Kategori ============
  await db
    .insert(schema.bugCategories)
    .values(
      KATEGORI_AWAL.map((k, i) => ({
        name: k.name,
        color: k.color,
        sortOrder: i + 1,
      }))
    )
    .onConflictDoNothing();

  const kategoriTerpakai = new Set(mz.item.map((i) => i.kategori));
  for (const k of KATEGORI_AWAL) {
    if (kategoriTerpakai.has(k.name)) continue;
    await db
      .insert(schema.bugCategories)
      .values({ name: k.name, color: k.color, sortOrder: 0 })
      .onConflictDoNothing();
  }

  const semuaKategori = await db.select().from(schema.bugCategories);
  const petaKategori = new Map(semuaKategori.map((k) => [k.name, k.id]));
  console.log(`Kategori: ${semuaKategori.length} baris`);

  // ============ 4. Proyek (dibuat ulang agar seed idempoten) ============
  const lama = await db.query.projects.findFirst({
    where: (p, { eq: e }) => e(p.name, NAMA_PROYEK),
  });
  if (lama) {
    // Hapus dari anak ke induk karena ada foreign key. Subquery dipakai
    // sebagai daftar id, bukan ekspresi, jadi harus lewat inArray.
    const bugIdProyek = db
      .select({ id: schema.bugs.id })
      .from(schema.bugs)
      .where(eq(schema.bugs.projectId, lama.id));
    const testCaseIdProyek = db
      .select({ id: schema.testCases.id })
      .from(schema.testCases)
      .where(eq(schema.testCases.projectId, lama.id));

    await db
      .delete(schema.testRuns)
      .where(inArray(schema.testRuns.testCaseId, testCaseIdProyek));
    await db
      .delete(schema.testCases)
      .where(eq(schema.testCases.projectId, lama.id));
    await db
      .delete(schema.reportNotes)
      .where(eq(schema.reportNotes.projectId, lama.id));
    await db
      .delete(schema.scopeRequests)
      .where(eq(schema.scopeRequests.projectId, lama.id));
    await db
      .delete(schema.bugStatusHistory)
      .where(inArray(schema.bugStatusHistory.bugId, bugIdProyek));
    await db
      .delete(schema.bugComments)
      .where(inArray(schema.bugComments.bugId, bugIdProyek));
    await db
      .delete(schema.attachments)
      .where(inArray(schema.attachments.bugId, bugIdProyek));
    await db.delete(schema.bugs).where(eq(schema.bugs.projectId, lama.id));
    await db.delete(schema.modules).where(eq(schema.modules.projectId, lama.id));
    await db.delete(schema.projects).where(eq(schema.projects.id, lama.id));
    console.log(`Proyek lama "${NAMA_PROYEK}" dihapus, dibuat ulang.`);
  }

  const [proyek] = await db
    .insert(schema.projects)
    .values({ name: NAMA_PROYEK })
    .returning();
  console.log(`Proyek: ${proyek.name} (id=${proyek.id})`);

  // ============ 5. User PIC ============
  const namaPic = new Set<string>();
  for (const j of mz.jira) if (j.pic) namaPic.add(j.pic);
  for (const i of mz.item) if (i.picName) namaPic.add(i.picName);

  const petaUser = new Map<string, number>();
  for (const pic of namaPic) {
    const email = `${slug(pic)}@contoh.local`;
    let u = await db.query.users.findFirst({
      where: (x, { eq: e }) => e(x.email, email),
    });
    if (!u) {
      // Password acak: akun PIC tidak dimaksudkan untuk login.
      const passwordHash = await bcrypt.hash(
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
        10
      );
      [u] = await db
        .insert(schema.users)
        .values({ name: pic, email, passwordHash, role: "developer" })
        .returning();
    }
    petaUser.set(pic, u.id);
  }
  console.log(`User PIC: ${petaUser.size} orang`);

  // ============ 6. Modul dari Area / Modul ============
  const petaModul = new Map<string, number>();
  const areaUnik = new Set<string>();
  for (const j of mz.jira) if (j.area) areaUnik.add(j.area);
  for (const i of mz.item) if (i.area) areaUnik.add(i.area);

  for (const area of areaUnik) {
    const [m] = await db
      .insert(schema.modules)
      .values({ projectId: proyek.id, name: area })
      .onConflictDoNothing()
      .returning();
    if (m) {
      petaModul.set(area, m.id);
    } else {
      const ada = await db.query.modules.findFirst({
        where: (x, { and, eq: e }) =>
          and(e(x.projectId, proyek.id), e(x.name, area)),
      });
      if (ada) petaModul.set(area, ada.id);
    }
  }
  console.log(`Modul (Component): ${petaModul.size} buah`);

  // ============ 7. Issue Jira yang dikeluarkan dari analisis ============
  const judulIkutAnalisis = new Set(
    mz.item
      .filter((i) => i.jiraKey)
      .map((i) =>
        i.judul.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
      )
  );

  const dikecualikan = mz.jira.filter(
    (j) =>
      !judulIkutAnalisis.has(
        j.judul.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
      )
  );

  for (const j of dikecualikan) {
    await db.insert(schema.bugs).values({
      code: j.key,
      projectId: proyek.id,
      moduleId: petaModul.get(j.area) ?? null,
      title: j.judul,
      severity:
        SEVERITY_DARI_PRIORITY[
          j.priority.toLowerCase() === "high" ? 1 : 2
        ] ?? "sedang",
      priority: j.priority.toLowerCase() === "high" ? 1 : 2,
      status: "selesai",
      reporterId: admin.id,
      assigneeId: petaUser.get(j.pic) ?? null,
      foundAt: j.dibuat ? new Date(`${j.dibuat}T08:00:00+07:00`) : new Date(),
      createdAt: j.dibuat ? new Date(`${j.dibuat}T08:00:00+07:00`) : new Date(),
      closedAt: j.selesai
        ? new Date(`${j.selesai}T17:00:00+07:00`)
        : j.dibuat
          ? new Date(`${j.dibuat}T17:00:00+07:00`)
          : null,
      categoryId: null,
      itemType: "bug",
      source: "jira",
      jiraKey: j.key,
      jiraUrl: j.url || null,
      fixVersion: j.fixVersion || null,
      picName: j.pic || null,
      excludeFromAnalysis: true,
      excludeReason:
        "Dikeluarkan dari analisis sesuai permintaan (tidak ada di tabel detail analisis)",
    });
  }
  console.log(`Issue Jira dikeluarkan dari analisis: ${dikecualikan.length}`);

  // ============ 8. Item analisis ============
  let nomor = 0;
  for (const it of mz.item) {
    nomor += 1;
    const dibuat = it.tanggal;
    const selesai = it.status === "selesai" ? selesaiPakai(dibuat, 3) : null;
    await db.insert(schema.bugs).values({
      code: it.jiraKey ?? `TAMB-2026-${String(nomor).padStart(3, "0")}`,
      projectId: proyek.id,
      moduleId: petaModul.get(it.area) ?? null,
      title: it.judul,
      description: null,
      severity: SEVERITY_DARI_PRIORITY[it.priority] ?? "sedang",
      priority: it.priority,
      status: it.status,
      reporterId: admin.id,
      assigneeId: it.picName ? (petaUser.get(it.picName) ?? null) : null,
      foundAt: new Date(`${dibuat}T08:00:00+07:00`),
      createdAt: new Date(`${dibuat}T08:00:00+07:00`),
      closedAt: selesai ? new Date(selesai) : null,
      categoryId: petaKategori.get(it.kategori) ?? null,
      itemType: it.itemType,
      source: it.jiraKey ? "jira" : "manual",
      jiraKey: it.jiraKey,
      jiraUrl: it.jiraUrl,
      fixVersion: it.fixVersion,
      picName: it.picName,
      actionNote: it.actionNote,
      labels: [],
      excludeFromAnalysis: false,
    });
  }
  console.log(`Item analisis dibuat: ${mz.item.length}`);

  // ============ 9. Request scope tambahan ============
  for (const s of mz.scope) {
    const posisi = s.posisi.toLowerCase().includes("dalam")
      ? "dalam_phase"
      : "luar_phase";
    await db.insert(schema.scopeRequests).values({
      projectId: proyek.id,
      discussedOn: `${BULAN_LAPORAN}-14`,
      requester: s.requester,
      area: s.area,
      request: s.request,
      expectedOutcome: s.expectedOutcome,
      types: s.tipe,
      label: s.kategoriTeks || null,
      phasePosition: posisi,
      status: "dibahas",
      notes: s.catatan,
      createdBy: admin.id,
    });
  }
  console.log(`Request scope dibuat: ${mz.scope.length}`);

  // ============ 10. Ringkasan hasil seed ============
  const baris = await db.execute(
    `
    SELECT
      count(*) FILTER (WHERE NOT exclude_from_analysis)::int                  AS analisis,
      count(*) FILTER (WHERE NOT exclude_from_analysis
                         AND item_type = 'bug')::int                          AS bug,
      count(*) FILTER (WHERE NOT exclude_from_analysis
                         AND status IN ('dikonfirmasi','diperbaiki'))::int   AS belum_selesai,
      count(*) FILTER (WHERE exclude_from_analysis)::int                      AS dikecualikan
    FROM bugs WHERE project_id = ${proyek.id}
  `
  );
  const r = baris[0] as Record<string, number>;
  const tingkat = ((r.bug - r.belum_selesai) / r.bug) * 100;
  console.log("\n===== CEK ANGKA (target dokumen bagian 14) =====");
  console.log(`Item analisis        : ${r.analisis}   target 29`);
  console.log(`Total Bug Tercatat   : ${r.bug}   target 25`);
  console.log(`Bug Belum Selesai    : ${r.belum_selesai}   target 2`);
  console.log(`Resolution Rate      : ${tingkat.toFixed(1)}%   target 92%`);
  console.log(`Issue dikecualikan   : ${r.dikecualikan}   target 10`);
  console.log(`Request scope        : ${mz.scope.length}   target 8`);

  console.log(`\nSeed selesai. Login admin: ${adminEmail} / ${adminPassword}`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});