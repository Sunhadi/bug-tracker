"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./ui";

export interface ToastItem {
  id: number;
  pesan: string;
  tone?: "default" | "warn";
  aksi?: { label: string; jalankan: () => void };
}

interface ToastContextValue {
  tampil: (pesan: string, opsi?: Omit<ToastItem, "id" | "pesan">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Auto-tutup 5 detik, pojok kanan bawah, bisa punya aksi. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const tampil = useCallback<ToastContextValue["tampil"]>((pesan, opsi) => {
    const id = ++counter.current;
    setItems((prev) => [...prev, { id, pesan, ...opsi }]);
  }, []);

  const tutup = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ tampil }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onTutup={() => tutup(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onTutup,
}: {
  item: ToastItem;
  onTutup: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onTutup, 5000);
    return () => clearTimeout(timer);
  }, [onTutup]);

  return (
    <div className="pop pointer-events-auto flex items-start gap-3 rounded-panel border border-line bg-surface px-3 py-2 animate-[fade-in_120ms_ease-out]">
      <p
        className={`flex-1 text-sm ${
          item.tone === "warn" ? "text-warn" : "text-ink"
        }`}
      >
        {item.pesan}
      </p>
      {item.aksi && (
        <Button
          variant="default"
          onClick={() => {
            item.aksi?.jalankan();
            onTutup();
          }}
          className="h-6 px-2 text-xs"
        >
          {item.aksi.label}
        </Button>
      )}
      <button
        type="button"
        onClick={onTutup}
        aria-label="Tutup notifikasi"
        className="btn -mr-1 h-6 min-h-0 w-6 min-w-0 rounded-control px-0 text-xs text-ink-3 hover:bg-bg hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return ctx;
}