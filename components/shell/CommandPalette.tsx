"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NAVIGASI } from "@/lib/nav";

interface IssueSingkat {
  id: number;
  code: string | null;
  title: string;
  status: string;
}

/**
 * Command palette: cari issue, lompat halaman, jalankan aksi.
 * Dipakai lewat Ctrl/Cmd+K dan kolom cari di top bar.
 */
export function CommandPalette({
  terbuka,
  onTutup,
}: {
  terbuka: boolean;
  onTutup: () => void;
}) {
  if (!terbuka) return null;
  // Komponen dalam hanya dipasang saat terbuka, jadi isi pencarian selalu
  // mulai kosong tanpa mereset state dari efek.
  return <IsiPalette onTutup={onTutup} />;
}

function IsiPalette({ onTutup }: { onTutup: () => void }) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [issues, setIssues] = useState<IssueSingkat[]>([]);

  useEffect(() => {
    let batal = false;
    (async () => {
      const res = await fetch("/api/bugs?limit=50");
      if (!res.ok || batal) return;
      const json: { data: BugApi[] } = await res.json();
      if (batal) return;
      setIssues(
        json.data.slice(0, 50).map((b) => ({
          id: b.id,
          code: b.code,
          title: b.title,
          status: b.status,
        }))
      );
    })();
    return () => {
      batal = true;
    };
  }, []);

  const halaman = useMemo(
    () =>
      NAVIGASI.flatMap((g) =>
        g.item.map((i) => ({
          href: i.href,
          label: i.label,
          grup: g.judul,
          icon: i.icon,
        }))
      ),
    []
  );

  const issueCocok = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return issues.slice(0, 8);
    return issues
      .filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.code ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [cari, issues]);

  function pergi(href: string) {
    router.push(href);
    onTutup();
  }

  const gayaGrup =
    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase";
  const gayaItem =
    "flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm text-ink-2 data-[selected=true]:bg-accent-soft data-[selected=true]:text-ink";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/50 p-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cari"
        className="shadow-modal w-full max-w-[560px] overflow-hidden rounded-pop border border-line bg-surface"
      >
        <Command
          label="Cari"
          loop
          className="flex flex-col"
          onKeyDown={(e) => {
            if (e.key === "Escape") onTutup();
          }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={14} aria-hidden="true" className="text-ink-3" />
            <Command.Input
              value={cari}
              onValueChange={setCari}
              placeholder="Cari issue, halaman, atau aksi"
              className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </div>

          <Command.List className="max-h-[52vh] overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-ink-2">
              Tidak ada yang cocok.
            </Command.Empty>

            {issueCocok.length > 0 && (
              <Command.Group heading="Issue" className={gayaGrup}>
                {issueCocok.map((b) => (
                  <Command.Item
                    key={b.id}
                    value={`issue ${b.title} ${b.code ?? ""}`}
                    onSelect={() => pergi(`/bugs/${b.id}`)}
                    className={gayaItem}
                  >
                    <span className="code w-[76px] shrink-0 text-xs text-ink-3">
                      {b.code}
                    </span>
                    <span className="truncate">{b.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Halaman" className={gayaGrup}>
              {halaman
                .filter((h) => h.label.toLowerCase().includes(cari.toLowerCase()))
                .map((h) => (
                  <Command.Item
                    key={h.href}
                    value={`halaman ${h.label} ${h.grup}`}
                    onSelect={() => pergi(h.href)}
                    className={gayaItem}
                  >
                    <FontAwesomeIcon
                      icon={h.icon}
                      className="h-3.5! w-3.5! shrink-0 text-ink-3"
                      aria-hidden="true"
                    />
                    <span className="truncate">{h.label}</span>
                    <span className="ml-auto text-xs text-ink-3">{h.grup}</span>
                  </Command.Item>
                ))}
            </Command.Group>

            <Command.Group heading="Aksi" className={gayaGrup}>
              <Command.Item
                value="aksi buat issue baru"
                onSelect={() => pergi("/bugs/new")}
                className={gayaItem}
              >
                Buat issue baru
              </Command.Item>
              <Command.Item
                value="aksi daftar issue"
                onSelect={() => pergi("/bugs")}
                className={gayaItem}
              >
                Buka daftar issue
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

interface BugApi {
  id: number;
  code: string | null;
  title: string;
  status: string;
}
