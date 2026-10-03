import { useEffect, useRef, useState } from "react";
import { ChevronLeft, PartyPopper } from "lucide-react";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  stores: { id: string; name: string }[];
  activeId: string | null;
  items: ShoppingItem[];
  onSelect: (id: string | null) => void;
  // רשימות מיוחדות / אירועים
  events?: { id: string; name: string }[];
  activeEventId?: string | null;
  onSelectEvent?: (id: string) => void;
};

// צבע עדין קבוע לכל חנות לפי מיקומה
export const storeTone = (stores: { id: string }[], id: string | null | undefined) => {
  const i = stores.findIndex((s) => s.id === id);
  return i < 0 ? undefined : (i % 6) + 1;
};

// לשוניות: רשימה כללית, חנויות ואירועים — לחיצה עוברת לרשימה המתאימה
export function StoreChips({ stores, activeId, items, onSelect, events = [], activeEventId = null, onSelectEvent }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const todo = items.filter((i) => !i.completed);
  const count = (id: string) => todo.filter((i) => i.storeId === id).length;

  const check = () => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) > 4);
  };
  useEffect(() => { check(); }, [stores.length, items.length, events.length]);

  const base = "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors";
  const on = "border-primary bg-primary text-primary-foreground";
  const off = "border-border bg-card text-foreground hover:bg-accent";
  const badge = (a: boolean, n: number) => <span className={`rounded-full px-1.5 text-xs ${a ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>{n}</span>;

  const generalActive = !activeEventId && activeId === null;
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div ref={ref} data-no-swipe onScroll={check} className="flex gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => onSelect(null)} className={`${base} ${generalActive ? on : off}`}>
          רשימה כללית{badge(generalActive, todo.length)}
        </button>
        {stores.map((s) => {
          const a = !activeEventId && s.id === activeId;
          const tone = storeTone(stores, s.id);
          return (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)} className={`${base} ${a ? on : off}`}>
              {tone && !a && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(--store-${tone}-fg)` }} />}
              {s.name}{badge(a, count(s.id))}
            </button>
          );
        })}
        {events.map((ev) => {
          const a = ev.id === activeEventId;
          return (
            <button key={ev.id} type="button" onClick={() => onSelectEvent?.(ev.id)} className={`${base} ${a ? on : off}`}>
              <PartyPopper className="h-3.5 w-3.5" />{ev.name}
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
