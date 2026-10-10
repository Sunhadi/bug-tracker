import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { uploadAttachment } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bugId = parseInt(formData.get("bug_id") as string, 10);

    if (!file || !bugId) {
      return NextResponse.json(
        { error: "file dan bug_id wajib diisi" },
        { status: 400 }
      );
    }

    // Cek bug exists
    const bug = await db.query.bugs.findFirst({
      where: (b, { eq }) => eq(b.id, bugId),
    });
    if (!bug) {
      return NextResponse.json({ error: "Bug tidak ditemukan" }, { status: 404 });
    }

    // Upload ke Vercel Blob
    let uploadResult;
    try {
      uploadResult = await uploadAttachment(file, bugId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload gagal";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Simpan record
    const [attachment] = await db
      .insert(attachments)
      .values({
        bugId,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        sizeBytes: uploadResult.sizeBytes,
        storageKey: uploadResult.storageKey,
        uploadedBy: user.id,
      })
      .returning();

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
