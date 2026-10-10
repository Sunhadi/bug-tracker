import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sql } from "drizzle-orm";

/** db.execute() mengembalikan RowList yang iterable, bukan objek ber-property .rows */
function toRows<T = Record<string, unknown>>(result: unknown): T[] {
  return Array.from(result as Iterable<T>);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Parameter date wajib format YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const userId = session.userId;

  // Bug yang ditemukan
  const ditemukan = toRows<{ code: string; title: string }>(
    await db.execute(sql`
      SELECT code, title FROM bugs
      WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = ${date}::date
        AND reporter_id = ${userId};
    `)
  );

  // Bug yang diretest atau berubah status
  const statusChanges = toRows<{
    code: string;
    title: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
  }>(
    await db.execute(sql`
      SELECT b.code, b.title, h.from_status, h.to_status, h.note
      FROM bug_status_history h
      JOIN bugs b ON b.id = h.bug_id
      WHERE (h.changed_at AT TIME ZONE 'Asia/Jakarta')::date = ${date}::date
        AND h.changed_by = ${userId}
      ORDER BY h.changed_at;
    `)
  );

  // Bug yang dikomentari
  const comments = toRows<{ code: string; title: string; body: string }>(
    await db.execute(sql`
      SELECT b.code, b.title, c.body
      FROM bug_comments c
      JOIN bugs b ON b.id = c.bug_id
      WHERE (c.created_at AT TIME ZONE 'Asia/Jakarta')::date = ${date}::date
        AND c.user_id = ${userId};
    `)
  );

  // Kendala: bug yang masih menggantung
  const kendala = toRows<{ code: string; title: string; status: string }>(
    await db.execute(sql`
      SELECT code, title, status FROM bugs
      WHERE status IN ('baru','dikonfirmasi','diperbaiki','retest','dibuka_ulang')
        AND (reporter_id = ${userId} OR assignee_id = ${userId});
    `)
  );

  // Susun draf teks
  const draf = susunDraf(date, {
    ditemukan,
    statusChanges,
    comments,
    kendala,
  });

  return NextResponse.json({
    data: {
      date,
      ditemukan,
      statusChanges,
      comments,
      kendala,
      draf,
    },
  });
}

type StatusChange = {
  code: string;
  title: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
};
type BugRow = { code: string; title: string };
type CommentRow = { code: string; title: string; body: string };
type KendalaRow = { code: string; title: string; status: string };

const MIN_KARAKTER = 100;

function tandaiKurang(teks: string): string {
  return teks.length < MIN_KARAKTER
    ? `${teks} [${teks.length}/${MIN_KARAKTER} karakter — kurang, lengkapi manual]`
    : teks;
}

function susunDraf(
  date: string,
  data: {
    ditemukan: BugRow[];
    statusChanges: StatusChange[];
    comments: CommentRow[];
    kendala: KendalaRow[];
  }
) {
  const lines: string[] = [];

  // Uraian aktivitas
  const uraian: string[] = [];
  if (data.ditemukan.length > 0) {
    const codes = data.ditemukan.map((b) => b.code).join(", ");
    uraian.push(`Menemukan ${data.ditemukan.length} bug (${codes})`);
  }
  if (data.statusChanges.length > 0) {
    const retest = data.statusChanges.filter((s) => s.to_status === "retest");
    const lainnya = data.statusChanges.filter((s) => s.to_status !== "retest");
    if (retest.length > 0) {
      uraian.push(
        `Melakukan retest ${retest.map((r) => r.code).join(", ")}`
      );
    }
    if (lainnya.length > 0) {
      uraian.push(
        `Mengubah status: ${lainnya
          .map((s) => `${s.code} → ${s.to_status.replace("_", " ")}`)
          .join(", ")}`
      );
    }
  }
  if (data.comments.length > 0) {
    uraian.push(
      `Berdiskusi terkait ${data.comments.map((c) => c.code).join(", ")}`
    );
  }

  lines.push("=== URAIAN AKTIVITAS ===");
  lines.push(
    tandaiKurang(
      uraian.length > 0
        ? uraian.join("; ") + "."
        : "(Tidak ada aktivitas tercatat pada tanggal ini.)"
    )
  );

  // Kendala
  lines.push("");
  lines.push("=== KENDALA ===");
  if (data.kendala.length > 0) {
    const menungguDev = data.kendala.filter((k) =>
      ["baru", "dikonfirmasi", "diperbaiki"].includes(k.status)
    );
    const retest = data.kendala.filter(
      (k) => k.status === "retest" || k.status === "dibuka_ulang"
    );
    if (menungguDev.length > 0) {
      lines.push(
        `Bug menunggu perbaikan dev: ${menungguDev.map((k) => k.code).join(", ")}`
      );
    }
    if (retest.length > 0) {
      lines.push(
        `Bug menunggu retest: ${retest.map((k) => k.code).join(", ")}`
      );
    }
    if (menungguDev.length === 0 && retest.length === 0) {
      lines.push("(Tidak ada kendala yang menghambat.)");
    }
  } else {
    lines.push("(Tidak ada bug menggantung.)");
  }

  // Pembelajaran (kosong, diisi manual)
  lines.push("");
  lines.push("=== PEMBELAJARAN ===");
  lines.push("(diisi manual)");

  return lines.join("\n");
}
