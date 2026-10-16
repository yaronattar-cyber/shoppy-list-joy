import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2, PartyPopper, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  onCreateEvent?: () => void;
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
  void sorting; void move; void more;
  const storeTabs = tabs.filter((t) => t.kind === "store");
  const eventTabs = tabs.filter((t) => t.kind === "event");
  const activeStoreName = generalActive ? "רשימה כללית" : !activeEventId ? rawStores.find((s) => s.id === activeId)?.name : undefined;
  const activeEventName = activeEventId ? rawEvents.find((e) => e.id === activeEventId)?.name : undefined;
  const trig = (a: boolean) => `${base} min-w-0 flex-1 justify-between ${a ? on : off}`;
  return (
    <div className="mx-auto flex w-full max-w-2xl gap-2 px-4 pb-1 pt-2 sm:px-6">
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <button type="button" className={trig(!activeEventId)}><span className="truncate">{activeStoreName ?? "חנויות"}</span><ChevronDown className="h-4 w-4 shrink-0" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[60dvh] w-56 overflow-y-auto text-right">
          <DropdownMenuLabel>חנויות</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onSelect(null)} className="justify-between">רשימה כללית{badge(false, todo.length)}</DropdownMenuItem>
          {storeTabs.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => onSelect(t.id)} className="justify-between">
              <span className="flex items-center gap-1.5 truncate">{t.name}{t.isOnlineOnly && <Globe2 className="h-3 w-3" />}</span>{badge(false, count(t.id))}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <button type="button" className={trig(!!activeEventId)}><span className="flex min-w-0 items-center gap-1.5 truncate"><PartyPopper className="h-3.5 w-3.5 shrink-0" />{activeEventName ?? "אירועים"}</span><ChevronDown className="h-4 w-4 shrink-0" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[60dvh] w-56 overflow-y-auto text-right">
          <DropdownMenuLabel>אירועים מיוחדים</DropdownMenuLabel>
          {eventTabs.map((t) => <DropdownMenuItem key={t.id} onSelect={() => onSelectEvent?.(t.id)}>{t.name}</DropdownMenuItem>)}
          {!eventTabs.length && <p className="px-2 py-1 text-xs text-muted-foreground">אין אירועים עדיין</p>}
          {onCreateEvent && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={onCreateEvent}><Plus />אירוע חדש</DropdownMenuItem></>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
