import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  stores: { id: string; name: string }[];
  activeId: string | null;
  items: ShoppingItem[];
  onSelect: (id: string | null) => void;
};

// צבע עדין קבוע לכל חנות לפי מיקומה
export const storeTone = (stores: { id: string }[], id: string | null | undefined) => {
  const i = stores.findIndex((s) => s.id === id);
  return i < 0 ? undefined : (i % 6) + 1;
};

// לשוניות חנויות נגללות אופקית, עם „הצצה” ודהייה שמרמזות על המשך
export function StoreChips({ stores, activeId, items, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const todo = items.filter((i) => !i.completed);
  const count = (id: string | null) => todo.filter((i) => (i.storeId ?? null) === id).length;

  const check = () => {
    const el = ref.current;
    if (!el) return;
    // RTL: scrollLeft שלילי; נשאר תוכן אם לא הגענו לקצה השמאלי
    setMore(el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) > 4);
  };
  useEffect(() => { check(); }, [stores.length, items.length]);

  const chips: { id: string | null; label: string; n: number; all?: boolean }[] = [
    { id: null, label: "הכל", n: todo.length, all: true },
    ...stores.map((s) => ({ id: s.id, label: s.name, n: count(s.id) })),
  ];
  if (count(null) && stores.length) chips.push({ id: "__none", label: "ללא חנות", n: count(null) });

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div ref={ref} data-no-swipe onScroll={check} className="flex gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => {
          const active = c.all ? (activeId ?? null) === null : c.id === activeId;
          const tone = c.all || c.id === "__none" ? undefined : storeTone(stores, c.id);
          return (
            <button
              key={c.id ?? "all"}
              type="button"
              disabled={c.id === "__none"}
              onClick={() => onSelect(c.all ? null : c.id)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"} disabled:opacity-70`}
            >
              {tone && !active && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(--store-${tone}-fg)` }} />}
              {c.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>{c.n}</span>
            </button>
          );
        })}
        <span className="w-8 shrink-0" aria-hidden />
      </div>
      {more && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center justify-start bg-gradient-to-r from-background via-background/80 to-transparent pl-1">
          <ChevronLeft className="h-5 w-5 animate-pulse text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
