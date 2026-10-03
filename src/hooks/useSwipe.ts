import { useRef } from "react";

// זיהוי החלקה אופקית באצבע — למעבר בין מסכים
export function useSwipe(handlers: { onLeft?: () => void; onRight?: () => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      // לא מנווטים כשהמגע התחיל באזור גלילה אופקית או בחלונית
      const el = e.target as HTMLElement | null;
      if (el?.closest("[data-no-swipe],[role=dialog],[role=menu],[role=listbox],input,textarea,select")) { start.current = null; return; }
      // כל אלמנט שנגלל אופקית (למשל לשוניות חנויות) — גלילה ולא מעבר מסך
      for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) {
          start.current = null;
          return;
        }
      }
      if (t) start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      const t = e.changedTouches[0];
      start.current = null;
      if (!s || !t) return;
      // אירועי מגע מחלוניות (Portal) מבעבעים דרך React — לא מנווטים כשחלונית פתוחה
      if (document.querySelector("[role=dialog]")) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) handlers.onLeft?.();
      else handlers.onRight?.();
    },
  };
}
