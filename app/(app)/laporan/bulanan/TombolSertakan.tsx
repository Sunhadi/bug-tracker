"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

/** Saklar "Tampilkan yang dikecualikan" di tab Kategori Bug. */
export default function TombolSertakan({
  bulan,
  projectId,
  aktif,
  total,
}: {
  bulan: string;
  projectId: number | null;
  aktif: boolean;
  total: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, start] = useTransition();

  function toggle() {
    const p = new URLSearchParams(sp.toString());
    p.set("bulan", bulan);
    if (projectId) p.set("project_id", String(projectId));
    if (aktif) p.delete("dikecualikan");
    else p.set("dikecualikan", "1");
    const qs = p.toString();
    start(() => router.replace(`?${qs}`, { scroll: false }));
  }

  return (
    <Button size="sm" variant="default" onClick={toggle} aria-pressed={aktif}>
      {aktif ? "Sembunyikan yang dikecualikan" : `Tampilkan ${total} yang dikecualikan`}
    </Button>
  );
}