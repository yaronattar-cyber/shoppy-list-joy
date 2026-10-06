import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Globe2, PartyPopper } from "lucide-react";
import { useTabOrder } from "@/hooks/useTabOrder";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  stores: { id: string; name: string; isOnlineOnly?: boolean }[];
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
export function StoreChips({ stores: rawStores, activeId, items, onSelect, events: rawEvents = [], activeEventId = null, onSelectEvent }: Props) {
  const tabOrder = useTabOrder();
  const [sorting, setSorting] = useState(false);
  const tabs = tabOrder.sort([...rawStores.map((s) => ({ ...s, kind: "store" as const })), ...rawEvents.map((e) => ({ ...e, kind: "event" as const }))]);
  const stores = rawStores;
  const move = (i: number, d: -1 | 1) => { const ids = tabs.map((t) => t.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j]!, ids[i]!]; void tabOrder.save(ids); };
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const todo = items.filter((i) => !i.completed);
  const count = (id: string) => todo.filter((i) => i.storeId === id).length;

  const check = () => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) > 4);
  };
  useEffect(() => { check(); }, [stores.length, items.length, rawEvents.length]);

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
        {tabs.map((t, i) => {
          const a = t.kind === "event" ? t.id === activeEventId : !activeEventId && t.id === activeId;
          const tone = t.kind === "store" ? storeTone(stores, t.id) : undefined;
          return (
            <span key={t.id} className="flex shrink-0 items-center gap-0.5">
              {sorting && <button type="button" aria-label="הזזה ימינה" onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-full bg-muted"><ChevronRight className="h-4 w-4" /></button>}
              <button type="button" onClick={() => (t.kind === "event" ? onSelectEvent?.(t.id) : onSelect(t.id))} className={`${base} ${a ? on : off}`}>
                {t.kind === "event" ? <PartyPopper className="h-3.5 w-3.5" /> : tone && !a && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(--store-${tone}-fg)` }} />}
                {t.name}{t.kind === "store" && t.isOnlineOnly && <span className="flex items-center gap-0.5 text-xs font-medium"><Globe2 className="h-3 w-3" />אונליין</span>}{t.kind === "store" && badge(a, count(t.id))}
              </button>
              {sorting && <button type="button" aria-label="הזזה שמאלה" onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-full bg-muted"><ChevronLeft className="h-4 w-4" /></button>}
            </span>
          );
        })}
        {tabs.length > 1 && <button type="button" aria-label={sorting ? "סיום סידור" : "סידור לשוניות"} onClick={() => setSorting((v) => !v)} className={`${base} ${sorting ? on : off}`}>{sorting ? <Check className="h-4 w-4" /> : <ArrowDownUp className="h-4 w-4" />}</button>}
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
