import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAttachmentUrl } from "@/lib/storage";
import { eq } from "drizzle-orm";

/**
 * GET /api/attachments/:id - Link public untuk membuka/mengunduh lampiran.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachmentId = parseInt(id, 10);

  const attachment = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
  });

  if (!attachment) {
    return NextResponse.json(
      { error: "Lampiran tidak ditemukan" },
      { status: 404 }
    );
  }

  const url = await getAttachmentUrl(attachment.storageKey);
  if (!url) {
    return NextResponse.json(
      { error: "Link lampiran tidak tersedia" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { url, fileName: attachment.fileName } });
}