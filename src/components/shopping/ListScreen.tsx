import { useMemo, useState } from "react";
import { Archive, CheckCheck, ChevronDown, ListPlus, ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ItemEditDrawer } from "./ItemEditDrawer";
import { ShoppingItemRow } from "./ShoppingItemRow";
import { HistorySuggestions } from "./HistorySuggestions";
import { matchHistory, type HistoryEntry } from "@/lib/product-history";
import { basketTotals, formatDistance, formatPrice, STORE_DISTANCES } from "@/lib/prices";
import { parsePastedList, type ShoppingItem } from "@/lib/shopping-list";

type ItemDetails = { name: string; quantity: number; unit: string; notes: string; category: string };
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
  onShop: () => void;
};

export function ListScreen(p: Props) {
  const [quick, setQuick] = useState("");
  const [selected, setSelected] = useState<ShoppingItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [showDone, setShowDone] = useState(true);
  const suggestions = useMemo(() => matchHistory(p.history, p.productHistory, quick), [p.history, p.productHistory, quick]);
  const todo = p.items.filter((item) => !item.completed);
  const done = p.items.filter((item) => item.completed);
  const [sort, setSort] = useState<"price" | "distance">("price");
  const doneCount = p.items.filter((item) => item.completed).length;
  const allDone = p.items.length > 0 && doneCount === p.items.length;
  const totals = useMemo(() => basketTotals(p.items.map((item) => item.name)), [p.items]);
  const cheapest = totals[0];
  const nearest = [...totals].sort((a, b) => STORE_DISTANCES[a.store] - STORE_DISTANCES[b.store])[0];
  const sortedTotals = [...totals].sort((a, b) => sort === "price" ? a.total - b.total : STORE_DISTANCES[a.store] - STORE_DISTANCES[b.store]);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-44 pt-4 sm:px-6">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6">
        <h1 className="mb-3 text-2xl font-bold text-foreground">הרשימה שלי</h1>
        <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={(event) => { event.preventDefault(); if (p.onAdd(quick)) setQuick(""); }}>
          <input value={quick} onChange={(event) => setQuick(event.target.value)} placeholder="הוספת מוצר..." aria-label="הוספה מהירה" className="h-11 min-w-0 rounded-md border border-input bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" className="h-11 px-4"><ListPlus />הוסף</Button>
        </form>
        <HistorySuggestions items={suggestions} onPick={(name) => { if (p.onAdd(name)) setQuick(""); }} />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <p className="min-w-0 text-sm text-muted-foreground">{p.items.length ? `${doneCount} מתוך ${p.items.length} הושלמו` : "הרשימה ריקה"}</p>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => p.onMarkAll(!allDone)}><CheckCheck />{allDone ? "בטל הכל" : "סמן הכל"}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setImportOpen(true)}>ייבוא</Button>
        </div>
      </div>

      {todo.length > 0 && <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {todo.map((item) => <ShoppingItemRow key={item.id} item={item} onToggle={p.onToggle} onOutOfStock={p.onOutOfStock} onOpen={setSelected} />)}
      </ul>}
      {p.items.length > 0 && <p className="mt-2 text-xs text-muted-foreground">הקשה: נקנה · הקשה כפולה או לחיצה ארוכה: חסר במלאי</p>}
      {done.length > 0 && (
        <section className="mt-6">
          <Button type="button" variant="ghost" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="mb-2 h-9 w-full justify-between px-1 text-sm font-semibold text-muted-foreground">
            <span>פריטים שנרכשו ({done.length})</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showDone ? "rotate-180" : ""}`} />
          </Button>
          {showDone && <ul className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">{done.map((item) => <ShoppingItemRow key={item.id} item={item} onToggle={p.onToggle} onOutOfStock={p.onOutOfStock} onOpen={setSelected} />)}</ul>}
        </section>
      )}
      {!p.items.length && <div className="mt-12 text-center text-muted-foreground"><ShoppingCart className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>הוסיפו מוצר ראשון למעלה</p></div>}

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-2xl space-y-2 px-4 sm:px-6">
        {cheapest && nearest && (
          <Button type="button" variant="outline" onClick={() => setPricesOpen(true)} className="h-auto w-full justify-start whitespace-normal rounded-full border-border bg-card px-4 py-2.5 text-right shadow-lg">
            <Tag className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-sm"><strong>סל זול: {cheapest.store} (₪{formatPrice(cheapest.total)})</strong><span className="text-muted-foreground"> · קרוב: {nearest.store} ({formatDistance(STORE_DISTANCES[nearest.store])})</span></span>
          </Button>
        )}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          <Button type="button" variant="outline" disabled={!doneCount} onClick={p.onArchive}><Archive />ארכוב</Button>
          <Button type="button" onClick={p.onShop}><ShoppingCart />יציאה לקניות</Button>
        </div>
      </div>

      <ItemEditDrawer item={selected} onClose={() => setSelected(null)} onSave={p.onUpdate} onDelete={p.onRemove} />

      <Drawer open={importOpen} onOpenChange={setImportOpen}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
          <DrawerHeader className="text-right sm:text-right"><DrawerTitle>ייבוא מ־Google Keep</DrawerTitle><DrawerDescription>כל שורה תהפוך למוצר נפרד.</DrawerDescription></DrawerHeader>
          <div className="px-4"><textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={8} className="w-full rounded-md border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" /></div>
          <div className="grid grid-cols-2 gap-2 p-4"><DrawerClose asChild><Button variant="outline">ביטול</Button></DrawerClose><Button onClick={async () => { await p.onAddMany(parsePastedList(pasted)); setPasted(""); setImportOpen(false); }}>ייבוא {parsePastedList(pasted).length || ""}</Button></div>
        </DrawerContent>
      </Drawer>

      <Drawer open={pricesOpen} onOpenChange={setPricesOpen}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
          <DrawerHeader className="text-right sm:text-right"><DrawerTitle>השוואת סל</DrawerTitle><DrawerDescription>מחירים ומרחקים משוערים בלבד.</DrawerDescription></DrawerHeader>
          <div className="px-4 pb-6">
            <div className="mb-3 grid grid-cols-2 rounded-md bg-muted p-1"><Button type="button" size="sm" variant={sort === "price" ? "default" : "ghost"} onClick={() => setSort("price")}>לפי מחיר</Button><Button type="button" size="sm" variant={sort === "distance" ? "default" : "ghost"} onClick={() => setSort("distance")}>לפי מרחק</Button></div>
            <ul className="overflow-hidden rounded-lg border border-border">{sortedTotals.map((total, index) => <li key={total.store} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-3 last:border-0"><span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><span className="font-semibold">{total.store}<small className="block font-normal text-muted-foreground">{formatDistance(STORE_DISTANCES[total.store])}</small></span><strong>₪{formatPrice(total.total)}</strong></li>)}</ul>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}