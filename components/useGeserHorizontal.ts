"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * Area yang bisa digeser ke kiri dan kanan dengan tiga cara:
 * 1. Wheel atau trackpad (scroll horizontal bawaan).
 * 2. Drag dengan menekan area kosong lalu menyeretnya.
 * 3. Tombol panah kiri dan kanan saat area punya fokus.
 *
 * Batang scrollbar sengaja disembunyikan oleh utility `scrollbar-none`,
 * tapi kemampuan menggulirnya tetap utuh.
 */
export function useGeserHorizontal(ref: RefObject<HTMLElement | null>) {
  const [seret, setSeret] = useState(false);
  const mulai = useRef<{ x: number; kiri: number } | null>(null);
  // Menahan tombol pertama tidak akan menggulir; gitung jaraknya dulu
  // supaya drag kartu dan drag papan tidak saling berebut.
  const ambang = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;

    // Kalau pointerdown berawal dari dalam kartu, biarkan dnd-kit yang
    // menangani. Menyeret papan dan menyeret kartu harus terpisah.
    const dariKartu = (e.target as HTMLElement | null)?.closest?.("[data-kartu]");
    if (dariKartu) {
      mulai.current = null;
      return;
    }

    mulai.current = { x: e.clientX, kiri: el.scrollLeft };
    ambang.current = 0;
  }, [ref]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!mulai.current || !el) return;
      const delta = e.clientX - mulai.current.x;

      if (!seret) {
        // Baru dianggap menggeser setelah bergerak cukup jauh.
        if (Math.abs(delta) < 6) return;
        ambang.current = Math.abs(delta);
        setSeret(true);
        el.setPointerCapture(e.pointerId);
        return;
      }

      el.scrollLeft = mulai.current.kiri - delta;
    },
    [ref, seret]
  );

  const selesai = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (el && seret && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      mulai.current = null;
      setSeret(false);
    },
    [ref, seret]
  );

  // Gulir dengan wheel vertikal saat shift tidak ditekan.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      // Biarkan browser menangani wheel yang memang horizontal
      // (mis. trackpad digeser ke samping).
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.ctrlKey) return;
      const sebelum = el!.scrollLeft;
      el!.scrollLeft += e.deltaY;
      // Kalau BOARD tidak bisa bergeser lagi, biarkan halaman yang bergulir.
      if (el!.scrollLeft !== sebelum) {
        e.preventDefault();
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el) return;
    const langkah = 240;
    if (e.key === "ArrowRight") {
      el.scrollBy({ left: langkah, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      el.scrollBy({ left: -langkah, behavior: "smooth" });
    } else if (e.key === "Home") {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (e.key === "End") {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    } else {
      return;
    }
    e.preventDefault();
  }, [ref]);

  return {
    seret,
    handler: {
      onPointerDown,
      onPointerMove,
      onPointerUp: selesai,
      onPointerCancel: selesai,
      onKeyDown,
      tabIndex: 0,
      role: "region" as const,
      "aria-label": "Papan board, bisa digeser ke kiri dan kanan",
      "data-seret": seret ? "true" : "false",
    },
  };
}