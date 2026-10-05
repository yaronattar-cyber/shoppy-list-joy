import { PhotoProductButton } from "./PhotoProductButton";
import { FullScreenShopping } from "./FullScreenShopping";
import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCheck, ChevronDown, ClipboardList, Eye, Globe2, Layers, Maximize2, PartyPopper, Plus, Send, Share2, ShoppingCart, SlidersHorizontal, Sun, Tag, Wand2 } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { atStoreText, groupByCategory, listAsText, openWhatsApp, setWakeLock, wakeLockSupported } from "@/lib/shopping-tools";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AiRequestDrawer } from "./AiRequestDrawer";
import { ItemEditDrawer } from "./ItemEditDrawer";
import { TargetPicker, type AddTarget } from "./TargetPicker";
import { LongPressHint, ShoppingItemRow } from "./ShoppingItemRow";
import { storeTone } from "./StoreChips";
import { HistorySuggestions } from "./HistorySuggestions";
import { matchHistory, type HistoryEntry } from "@/lib/product-history";
import { basketTotals, formatDistance, formatPrice, STORE_DISTANCES } from "@/lib/prices";
import { parsePastedList, type ShoppingItem } from "@/lib/shopping-list";

type ItemDetails = { name: string; quantity: number; unit: string; notes: string; category: string; storeId?: string | null };
type Props = {
  items: ShoppingItem[];
  history: string[];
  productHistory: HistoryEntry[];
  onOutOfStock: (id: string) => void;
  onAdd: (name: string) => string | null;
  onAddMany: (names: string[]) => Promise<number>;
  onToggle: (id: string) => void;
  onUpdate: (id: string, details: ItemDetails) => void;
  onRemove: (id: string) => void;
  onMarkAll: (completed: boolean) => void;
  onArchive: () => void;
  storeName?: string | undefined;
  stores?: { id: string; name: string; isOnlineOnly?: boolean }[];
  activeStore?: { name: string; url: string; isOnlineOnly: boolean } | null;
  targets?: AddTarget[];
  onAddTo?: (name: string, target: AddTarget) => string | null;
  isGeneral?: boolean;
};

// שורת רשימה דחוסה: הוראות ממוקדות לרשימה זו בלבד (שורת הפריט המשותפת אינה נערכת)
const ROWS = "overflow-hidden rounded-lg border border-border bg-card shadow-sm [&_li]:gap-2 [&_li]:px-2 [&_li]:py-1.5 [&_.text-base]:text-sm [&_.text-base]:leading-5";

export function ListScreen(p: Props) {
  const [quick, setQuick] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  // הוספה ידנית: שואלים לאיזו רשימה לשייך
  const submitQuick = () => { const n = quick.trim(); if (!n) return; if (p.targets?.length && p.onAddTo) setPicking(n); else if (p.onAdd(n)) setQuick(""); };
  const [selected, setSelected] = useState<ShoppingItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // מצב "אני בסופר": קניות במסך מלא
  const [fullScreen, setFullScreen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [awake, setAwake] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [canWake, setCanWake] = useState(false);
  const onlineOnly = !!p.activeStore?.isOnlineOnly;
  useEffect(() => setCanWake(wakeLockSupported()), []);
  useEffect(() => () => { void setWakeLock(false); }, []);
  const suggestions = useMemo(() => matchHistory(p.history, p.productHistory, quick), [p.history, p.productHistory, quick]);
  const todo = p.items.filter((item) => !item.completed);
  const done = p.items.filter((item) => item.completed);
  // רשימה כללית: תגית חנות לכל פריט וקיבוץ לפי חנויות
  const general = !!p.isGeneral;
  const storeNameOf = (item: ShoppingItem) => p.stores?.find((s) => s.id === item.storeId)?.name ?? "ללא חנות";
  const tag = (item: ShoppingItem) => (general ? storeNameOf(item) : undefined);
  const byStore = general && !grouped;
  const storeGroups = (rows: ShoppingItem[]) => {
    const m = new Map<string, ShoppingItem[]>();
    for (const r of rows) { const k = storeNameOf(r); m.set(k, [...(m.get(k) ?? []), r]); }
    return [...m.entries()].sort(([a], [b]) => (a === "ללא חנות" ? 1 : b === "ללא חנות" ? -1 : a.localeCompare(b, "he")));
  };
  const [sort, setSort] = useState<"price" | "distance">("price");
  const doneCount = p.items.filter((item) => item.completed).length;
  const allDone = p.items.length > 0 && doneCount === p.items.length;
  const totals = useMemo(() => basketTotals(p.items), [p.items]);
  const cheapest = totals[0];
  const nearest = [...totals].sort((a, b) => STORE_DISTANCES[a.store] - STORE_DISTANCES[b.store])[0];
  const sortedTotals = [...totals].sort((a, b) => sort === "price" ? a.total - b.total : STORE_DISTANCES[a.store] - STORE_DISTANCES[b.store]);
  // רשימת פריטים משותפת לכל אופן תצוגה
  const rows = (list: ShoppingItem[]) => list.map((item) => <ShoppingItemRow key={item.id} item={item} storeLabel={tag(item)} storeTone={general ? storeTone(p.stores ?? [], item.storeId) : undefined} onToggle={p.onToggle} onOutOfStock={p.onOutOfStock} onOpen={setSelected} />);

  return (
    <section className="mx-auto w-full max-w-2xl px-3 pb-40 pt-0 sm:px-6">
      <TargetPicker name={picking} targets={p.targets ?? []} onCancel={() => setPicking(null)} onPick={(t) => { const n = picking ?? ""; setPicking(null); if (p.onAddTo?.(n, t)) setQuick(""); }} />

      {/* כותרת דקיקה + פעולות כאייקונים בלבד */}
      <header className="flex items-center gap-1.5 pb-1 pt-1">
        <h1 className="min-w-0 truncate text-sm font-semibold text-muted-foreground">רשימת קניות</h1>
        {p.items.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">{doneCount}/{p.items.length}</span>}
        <div className="ms-auto flex shrink-0 items-center">
          {!onlineOnly && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={!p.items.length} title="מצב קניות במסך מלא" aria-label="מצב קניות במסך מלא" onClick={() => setFullScreen(true)}><Maximize2 className="h-4 w-4" /></Button>}
          {!onlineOnly && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="אני בסופר" aria-label="אני בסופר" onClick={() => openWhatsApp(atStoreText(p.storeName))}><Share2 className="h-4 w-4" /></Button>}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={!todo.length} title="שלח רשימה" aria-label="שלח רשימה" onClick={() => openWhatsApp(listAsText(p.items, p.storeName))}><Send className="h-4 w-4" /></Button>
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="אפשרויות" aria-label="אפשרויות"><SlidersHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 text-right">
              <DropdownMenuLabel>תצוגה</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={grouped} onCheckedChange={(v) => setGrouped(!!v)} onSelect={(e) => e.preventDefault()} className="pl-2 pr-8 [&>span]:left-auto [&>span]:right-2"><Layers className="ml-2 h-4 w-4" />סידור לפי מחלקות</DropdownMenuCheckboxItem>
              {canWake && <DropdownMenuCheckboxItem checked={awake} onCheckedChange={async (v) => setAwake(await setWakeLock(!!v))} onSelect={(e) => e.preventDefault()} className="pl-2 pr-8 [&>span]:left-auto [&>span]:right-2"><Sun className="ml-2 h-4 w-4" />השאר מסך דולק</DropdownMenuCheckboxItem>}
              <DropdownMenuCheckboxItem checked={showDone} onCheckedChange={(v) => setShowDone(!!v)} onSelect={(e) => e.preventDefault()} className="pl-2 pr-8 [&>span]:left-auto [&>span]:right-2"><Eye className="ml-2 h-4 w-4" />הצג פריטים שנרכשו</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>פעולות</DropdownMenuLabel>
              <DropdownMenuItem disabled={!p.items.length} onSelect={() => p.onMarkAll(!allDone)}><CheckCheck />{allDone ? "בטל הכל" : "סמן הכל"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setImportOpen(true)}><ClipboardList />ייבוא מ־Keep</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* שורת הוספה אחת קומפקטית: שדה + מצלמה + בקשה חופשית + + */}
      <div className="sticky top-0 z-30 -mx-3 border-y border-border bg-background/95 px-3 py-1.5 backdrop-blur sm:-mx-6 sm:px-6">
        <form className="flex items-center gap-1 rounded-full border border-input bg-card px-1.5 focus-within:ring-2 focus-within:ring-ring" onSubmit={(event) => { event.preventDefault(); submitQuick(); }}>
          <input value={quick} onChange={(event) => setQuick(event.target.value)} placeholder="הוספת מוצר..." aria-label="הוספה מהירה" className="h-8 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" />
          {/* הכפתור המשותף מכווץ כאן בלבד */}
          <span className="shrink-0 [&>button]:h-7 [&>button]:w-7 [&>button]:rounded-full [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-0 [&>button>svg]:h-4 [&>button>svg]:w-4">
            <PhotoProductButton compact storeName={p.storeName || "הרשימה"} onAdd={(name) => p.onAdd(name)} />
          </span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" aria-label="בקשה חופשית" title="בקשה חופשית" onClick={() => setAiOpen(true)}><Wand2 className="h-4 w-4" /></Button>
          <Button type="submit" size="icon" className="h-7 w-7 shrink-0 rounded-full" aria-label="הוסף" title="הוסף"><Plus className="h-4 w-4" /></Button>
        </form>
        <HistorySuggestions items={suggestions} onPick={(name) => setQuick(name)} />
      </div>

      <LongPressHint />

      {onlineOnly && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5" />סמנו מוצר לאחר שהוספתם אותו לסל באתר.</p>}

      {allDone && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5">
          <PartyPopper className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">הסל הושלם</p>
          <Button type="button" size="sm" className="h-8 shrink-0" onClick={p.onArchive}><Archive className="h-4 w-4" />העבר למלאי</Button>
        </div>
      )}

      {/* הרשימה תופסת את מרבית המסך: מרווחים מינימליים בין קבוצות */}
      {todo.length > 0 && (byStore
        ? storeGroups(todo).map(([label, list]) => <section key={label} className="mt-2">
            <h2 className="mb-0.5 px-1 text-xs font-semibold text-muted-foreground">{label} ({list.length})</h2>
            <ul className={ROWS}>{rows(list)}</ul>
          </section>)
        : grouped
        ? groupByCategory(todo).map(([cat, list]) => <section key={cat} className="mt-2">
            <h2 className="mb-0.5 px-1 text-xs font-semibold text-muted-foreground">{cat} ({list.length})</h2>
            <ul className={ROWS}>{rows(list)}</ul>
          </section>)
        : <ul className={`mt-2 ${ROWS}`}>{rows(todo)}</ul>)}

      {done.length > 0 && (
        <section className="mt-3">
          <Button type="button" variant="ghost" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="mb-1 h-8 w-full justify-between px-1 text-xs font-semibold text-muted-foreground">
            <span>פריטים שנרכשו ({done.length})</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDone ? "rotate-180" : ""}`} />
          </Button>
          {showDone && <ul className={ROWS}>{rows(done)}</ul>}
        </section>
      )}

      {!p.items.length && <div className="mt-10 text-center text-muted-foreground"><ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-40" /><p className="text-sm">הוסיפו מוצר ראשון למעלה</p></div>}

      {/* סל מוזל: שורה רזה אחת עם אייקון, ולצידה פעולת ניקוי */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-2xl space-y-1.5 px-3 sm:px-6">
        {cheapest && nearest && todo.some((i) => !i.outOfStock) && (
          <Button type="button" variant="outline" onClick={() => setPricesOpen(true)} className="h-8 w-full justify-start gap-1.5 rounded-full border-border bg-card/95 px-3 text-xs shadow-md backdrop-blur">
            <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-right"><strong className="font-semibold">{cheapest.store} ₪{formatPrice(cheapest.total)}</strong><span className="text-muted-foreground"> · קרוב: {nearest.store}</span></span>
          </Button>
        )}
        <Button type="button" className="h-9 w-full text-sm" disabled={!doneCount} onClick={p.onArchive}><Archive className="h-4 w-4" />ניקוי פריטים שנקנו{doneCount ? ` (${doneCount})` : ""}</Button>
      </div>

      <ItemEditDrawer item={selected} stores={p.stores ?? []} onClose={() => setSelected(null)} onSave={p.onUpdate} onDelete={p.onRemove} onOutOfStock={p.onOutOfStock} />

      <AiRequestDrawer open={aiOpen} onOpenChange={setAiOpen} storeName={p.storeName} onAddMany={p.onAddMany} />

      <Drawer open={importOpen} onOpenChange={setImportOpen}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
          <DrawerHeader className="text-right sm:text-right"><DrawerTitle>ייבוא מ־Google Keep</DrawerTitle><DrawerDescription>כל שורה תהפוך למוצר נפרד.</DrawerDescription></DrawerHeader>
          <div className="px-4"><textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={8} className="w-full rounded-md border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></div>
          <div className="grid grid-cols-2 gap-2 p-4"><DrawerClose asChild><Button variant="outline">ביטול</Button></DrawerClose><Button onClick={async () => { await p.onAddMany(parsePastedList(pasted)); setPasted(""); setImportOpen(false); }}>ייבוא {parsePastedList(pasted).length || ""}</Button></div>
        </DrawerContent>
      </Drawer>

      <Drawer open={pricesOpen} onOpenChange={setPricesOpen}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
          <DrawerHeader className="text-right sm:text-right"><DrawerTitle>השוואת סל</DrawerTitle><DrawerDescription>המחירים משוערים ואינם מתעדכנים מהרשתות.</DrawerDescription></DrawerHeader>
          <div className="px-4 pb-6">
            <div className="mb-3 grid grid-cols-2 rounded-md bg-muted p-1"><Button type="button" size="sm" variant={sort === "price" ? "default" : "ghost"} onClick={() => setSort("price")}>לפי מחיר</Button><Button type="button" size="sm" variant={sort === "distance" ? "default" : "ghost"} onClick={() => setSort("distance")}>לפי מרחק</Button></div>
            <ul className="overflow-hidden rounded-lg border border-border">{sortedTotals.map((total, index) => <li key={total.store} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2.5 last:border-0"><span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><span className="font-semibold">{total.store}<small className="block font-normal text-muted-foreground">{formatDistance(STORE_DISTANCES[total.store])}</small></span><strong className="text-left">₪{formatPrice(total.total)}</strong></li>)}</ul>
          </div>
        </DrawerContent>
      </Drawer>

      {fullScreen && (
        <FullScreenShopping
          items={p.items}
          onToggle={p.onToggle}
          onOutOfStock={p.onOutOfStock}
          onAdd={p.onAdd}
          onExit={() => setFullScreen(false)}
        />
      )}
    </section>
  );
}
