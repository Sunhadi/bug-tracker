"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

/**
 * Saklar "Hitung: Hanya bug | Bug + temuan tambahan" di tab Kategori Bug.
 * Bug + temuan tambahan adalah padanan sheet "+ Tambahan" di file acuan.
 */
export default function SaklarHitung({
  bulan,
  projectId,
  aktif,
}: {
  bulan: string;
  projectId: number | null;
  aktif: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, start] = useTransition();

  function pilih(nilai: boolean) {
    const p = new URLSearchParams(sp.toString());
    p.set("bulan", bulan);
    if (projectId) p.set("project_id", String(projectId));
    else p.delete("project_id");
    if (nilai) p.set("hitung", "bug+tambahan");
    else p.delete("hitung");
    const qs = p.toString();
    start(() => router.replace(`?${qs}`, { scroll: false }));
  }

  return (
    <div
      role="group"
      aria-label="Hitung"
      className="inline-flex rounded-control border border-line-strong bg-surface p-0.5"
    >
      <Button
        size="sm"
        variant={aktif ? "primary" : "subtle"}
        aria-pressed={!aktif}
        onClick={() => pilih(false)}
        className="rounded-[2px]"
      >
        Hanya bug
      </Button>
      <Button
        size="sm"
        variant={aktif ? "primary" : "subtle"}
        aria-pressed={aktif}
        onClick={() => pilih(true)}
        className="rounded-[2px]"
      >
        Bug + temuan tambahan
      </Button>
    </div>
  );
}