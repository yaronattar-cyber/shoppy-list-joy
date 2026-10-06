import { InventoryAssistant } from "./InventoryAssistant";
import { RecipesDrawer } from "./RecipesDrawer";
import { MealPhotoPicker, MealThumb } from "./MealPhoto";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { STOCK_STATUS, addCustomCategory, inventoryCategoryOf, useInvCategories } from "@/lib/inventory-categories";
import { Bot, Check, CookingPot, Package, Plus, ScanBarcode, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { BarcodeScanner } from "./BarcodeScanner";
import { PhotoProductButton } from "./PhotoProductButton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/lib/quantity";
import { formatDateTime, type ShoppingItem } from "@/lib/shopping-list";
import type { OnlineOrder } from "@/hooks/useOnlineOrders";

type Props = {
  items: ShoppingItem[];
  onRestore: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onAddPreparedMeal: (name: string, photoUrl?: string | null) => boolean;
  familyId?: string;
  onSetPhoto?: (id: string, path: string) => void;
  onAddMissing: (names: string[]) => void;
  onUpdate: (id: string, d: { expiryDate: string | null; stockStatus: string; quantity: number; unit: string; category: string }) => void;
  onAddToInventory: (name: string, category: string) => boolean;
  orders?: OnlineOrder[];
  storeNames?: Record<string, string>;
  orderWorking?: boolean;
  onOrderReceived?: (orderId: string) => Promise<number>;
  onlineBought?: { id: string; title: string; store: string; price: string; image: string }[];
  onOnlineDelivered?: (id: string) => void;
};

// טאב פעולה קומפקטי — אייקון מעל טקסט, נראה אותו דבר בין אם זה כפתור רגיל או של הרכיב החיצוני
const TAB = "flex h-auto min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-transparent bg-muted/50 px-1 py-2 text-xs font-semibold text-primary shadow-none transition-all duration-200 ease-out hover:bg-primary/10 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const TAB_ON = "bg-primary text-primary-foreground shadow-sm hover:bg-primary";
const TAB_LABEL = "w-full truncate whitespace-nowrap text-center";
const TAB_BADGE = "absolute -left-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary-foreground px-0.5 text-xs font-bold leading-none text-primary ring-1 ring-primary/25";
const PANEL = "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none";

const daysLeft = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
// פיצול טקסט חופשי לפריטים: פסיקים או שורות חדשות
const splitItems = (s: string) => s.split(/[,،\n]+/).map((x) => x.trim()).filter(Boolean);

// מסך מלאי — מוצרים שנקנו; מחיקה שואלת אם להחזיר לרשימת הקניות
export function InventoryScreen({ items, familyId = "", onSetPhoto, onRestore, onDelete, onAddPreparedMeal, onUpdate, onAddMissing, onAddToInventory, orders = [], storeNames = {}, orderWorking, onOrderReceived, onlineBought = [], onOnlineDelivered }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [draft, setDraft] = useState({ expiryDate: "", stockStatus: "full", quantity: 1, unit: "", category: "other" });
  const cats = useInvCategories();
  const groups = useMemo(() => cats.map((c) => ({ ...c, items: items.filter((i) => inventoryCategoryOf(i.name, i.category) === c.id) })).filter((g) => g.items.length || g.id === "prepared-meal" || g.id.startsWith("custom-")), [items, cats]);
  const openItem = (i: ShoppingItem) => { setEditing(i); setDraft({ expiryDate: i.expiryDate ?? "", stockStatus: i.stockStatus ?? "full", quantity: i.quantity, unit: i.unit, category: inventoryCategoryOf(i.name, i.category) }); };
  const [pending, setPending] = useState<string[] | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("🏷️");
  const many = (pending?.length ?? 0) > 1;
  const saveCat = () => { if (addCustomCategory(catName, catEmoji)) { setCatName(""); setCatEmoji("🏷️"); setAddingCat(false); } };
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [addingProducts, setAddingProducts] = useState(false); // אקורדיון "הוספת מוצר/ים" סגור כברירת מחדל
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // העוזרת מצאה מוצר: סוגרים את החלונית, פותחים את הקטגוריה, גוללים ומדגישים
  const focusItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setAssistantOpen(false);
    setOpen((o) => ({ ...o, [inventoryCategoryOf(item.name, item.category)]: true }));
    setHighlightId(id);
    window.setTimeout(() => {
      document.querySelector(`[data-inv-item="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    window.setTimeout(() => setHighlightId(null), 3200);
  };
  // הטאב הפעיל הוא תמיד מה שבאמת פתוח — נקי אוטומטי כשחלונית נסגרת
  const activeTab = addingMeal ? "meal" : recipesOpen ? "recipes" : addingProducts ? "products" : ordersOpen ? "orders" : null;
  // טאב אחד פתוח בכל רגע
  const toggleProducts = () => { const next = !addingProducts; setAddingProducts(next); setOrdersOpen(false); };
  const toggleOrders = () => { const next = !ordersOpen; setOrdersOpen(next); setAddingProducts(false); };
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const receive = async (id: string) => {
    try { const n = await onOrderReceived?.(id); if (n) toast.success(`${n} מוצרים הועברו למלאי`); }
    catch { toast.error("לא הצלחנו להעביר את ההזמנה למלאי"); }
  };
  const [drafts, setDrafts] = useState<{ name: string; category: string }[]>([]);

  const appendText = (s: string) => setText((t) => (t.trim() ? `${t.trim()}\n${s}` : s));
  const addDirect = () => { const list = splitItems(text); const ok = list.filter((n) => onAddToInventory(n, inventoryCategoryOf(n, ""))).length; if (ok) toast.success(`${ok} מוצרים נוספו למלאי`); setText(""); };
  const addToDrafts = () => { setDrafts((l) => [...l, ...splitItems(text).map((n) => ({ name: n, category: inventoryCategoryOf(n, "") }))]); setText(""); };
  const approveDraft = (idx: number) => { const d = drafts[idx]; if (d && onAddToInventory(d.name, d.category)) setDrafts((l) => l.filter((_, j) => j !== idx)); };

  const addMeal = () => {
    if (!onAddPreparedMeal(mealName, mealPhoto)) return;
    setMealName("");
    setMealPhoto(null);
    setAddingMeal(false);
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">מלאי</h1>
          <p className="text-sm text-muted-foreground">{items.length ? `${items.length} מוצרים שנקנו` : "אין מוצרים במלאי"}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" aria-label="עוזרת אישית למלאי" title="עוזרת אישית למלאי" onClick={() => setAssistantOpen(true)}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md ring-1 ring-primary/30 transition-transform hover:scale-105">
            <Bot className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={!items.length} onClick={() => setPending(items.map((i) => i.id))} className="text-destructive hover:text-destructive">
            <Trash2 />ניקוי הכל
          </Button>
        </div>
      </header>

      {/* ארבע פעולות המלאי בשורה אחת: אייקון מעל טקסט, הטאב הפעיל מודגש */}
      <div role="group" aria-label="פעולות מלאי" className="mt-4 grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-sm">
        <button type="button" aria-haspopup="dialog" aria-expanded={addingMeal} onClick={() => setAddingMeal(true)} className={cn(TAB, activeTab === "meal" && TAB_ON)}>
          <CookingPot className="h-5 w-5" />
          <span className={TAB_LABEL}>מנה מוכנה</span>
        </button>
        <button type="button" aria-expanded={addingProducts} onClick={toggleProducts} className={cn(TAB, activeTab === "products" && TAB_ON)}>
          <span className="relative">
            <Package className="h-5 w-5" />
            {drafts.length > 0 && <span className={TAB_BADGE}>{drafts.length}</span>}
          </span>
          <span className={TAB_LABEL}>הוסף מוצר</span>
        </button>
        <RecipesDrawer
          names={items.map((i) => i.name)}
          onAddMissing={onAddMissing}
          label="מתכונים"
          triggerClassName={cn(TAB, activeTab === "recipes" && TAB_ON)}
          onOpenChange={(o) => { setRecipesOpen(o); if (o) { setAddingProducts(false); setOrdersOpen(false); } }}
        />
        <button type="button" aria-expanded={ordersOpen} onClick={toggleOrders} className={cn(TAB, activeTab === "orders" && TAB_ON)}>
          <span className="relative">
            <Truck className="h-5 w-5" />
            {orders.length > 0 && <span className={TAB_BADGE}>{orders.length}</span>}
          </span>
          <span className={TAB_LABEL}>בדרך</span>
        </button>
      </div>
      {addingProducts && (
        <div className={cn("mt-2 rounded-lg border border-border bg-card p-2 shadow-sm", PANEL)}>
          <div className="flex items-start gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="מוצר אחד או כמה, מופרדים בפסיק או בשורה" aria-label="הוספת מוצרים למלאי" className="min-h-11 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <Button type="button" variant="outline" className="h-11 w-11 px-0" aria-label="סריקת ברקוד" onClick={() => setScanning(true)}><ScanBarcode /></Button>
            <PhotoProductButton compact storeName="המלאי" onAdd={(n) => { appendText(n); return n; }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" size="sm" disabled={!splitItems(text).length} onClick={addDirect}>הוסף ישירות למלאי</Button>
            <Button type="button" size="sm" variant="outline" disabled={!splitItems(text).length} onClick={addToDrafts}>הוסף לרשימת ההמתנה</Button>
          </div>
          {drafts.length > 0 && (
            <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
              {drafts.map((d, idx) => (
                <li key={idx} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-foreground">{d.name}</span>
                  <select value={d.category} onChange={(e) => setDrafts((l) => l.map((x, j) => (j === idx ? { ...x, category: e.target.value } : x)))} aria-label={`קטגוריה ל${d.name}`} className="h-9 max-w-36 rounded-md border border-input bg-background px-2 text-sm">
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-primary" aria-label={`אישור ${d.name}`} onClick={() => approveDraft(idx)}><Check className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" aria-label={`הסרת ${d.name}`} onClick={() => setDrafts((l) => l.filter((_, j) => j !== idx))}><X className="h-4 w-4" /></Button>
                </li>
              ))}
              <Button type="button" size="sm" className="w-full" onClick={() => { drafts.forEach((d) => onAddToInventory(d.name, d.category)); setDrafts([]); }}>אישור הכל ({drafts.length})</Button>
            </ul>
          )}
        </div>
      )}

      <BarcodeScanner open={scanning} onClose={() => setScanning(false)} onResult={(n) => { appendText(n); setScanning(false); }} />

      {/* הזמנות אונליין ממתינות — "ההזמנה הגיעה" מעביר למלאי ומסיר את השורה */}
      {ordersOpen && (
        <div className={cn("mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm", PANEL)}>
          {!orders.length && <p className="p-3 text-center text-sm text-muted-foreground">אין הזמנות ממתינות</p>}
          {orders.map((o) => {
            const isOpen = expandedOrder === o.id;
            return (
              <div key={o.id} className="border-b border-border last:border-0">
                <button type="button" aria-expanded={isOpen} onClick={() => setExpandedOrder(isOpen ? null : o.id)} className="flex min-h-10 w-full items-center gap-2 px-3 text-right text-sm">
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{storeNames[o.storeId] ?? "חנות"}</span>
                  <span className="shrink-0 text-muted-foreground">|</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(o.orderedAt)}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/40 px-3 py-1.5">
                    <ul>
                      {o.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                          <span className="min-w-0 truncate">{it.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                    <Button type="button" size="sm" className="mt-1.5 w-full" disabled={orderWorking} onClick={() => void receive(o.id)}>
                      <span aria-hidden="true">📦</span>ההזמנה הגיעה
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      <div className="mt-4 space-y-3">
        {groups.map((g) => {
          const isOpen = open[g.id] ?? false; // בעת פתיחת המסך כל הקטגוריות סגורות
          return (
            <div key={g.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))} className="flex w-full items-center gap-2 px-3 py-2.5 text-right">
                <span className="text-xl" aria-hidden>{g.emoji}</span>
                <span className="flex-1 font-bold text-foreground">{g.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{g.items.length}</span>
                {g.id === "prepared-meal" && (
                  <span role="button" tabIndex={0} aria-label="הוספת מנה מוכנה" onClick={(e) => { e.stopPropagation(); setAddingMeal(true); }} className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></span>
                )}
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && g.items.length > 0 && (
                <ul className="border-t border-border">
                  {g.items.map((item) => {
                    const st = STOCK_STATUS.find((x) => x.id === (item.stockStatus ?? "full")) ?? STOCK_STATUS[0];
                    const dl = daysLeft(item.expiryDate);
                    return (
                      <li key={item.id} data-inv-item={item.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 transition-colors", highlightId === item.id && "animate-pulse bg-primary/15 ring-1 ring-inset ring-primary")}>
                        <button type="button" onClick={() => openItem(item)} className="min-w-0 text-right">
                          <span className="flex items-center gap-2">{g.id === "prepared-meal" && <MealThumb path={item.photoUrl} className="h-9 w-9" />}<span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} title={st.label} /><span className="break-words text-base font-semibold leading-6 text-foreground">{item.name}</span></span>
                          <span className="block text-xs text-muted-foreground">{st.label}{dl !== null && <span className={dl <= 2 ? " font-semibold text-destructive" : ""}> · {dl < 0 ? "פג תוקף" : dl === 0 ? "פג היום" : `תפוגה בעוד ${dl} ימים`}</span>}</span>
                        </button>
                        <span className="text-sm font-medium text-muted-foreground">{formatQuantity(item.quantity, item.unit) || "×1"}</span>
                        <Button type="button" size="icon" variant="ghost" aria-label={`מחיקת ${item.name}`} onClick={() => setPending([item.id])} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {!items.length && <div className="mt-8 text-center text-muted-foreground"><Package className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>מוצרים שנקנו או מנות מוכנות יופיעו כאן</p></div>}
      </div>

      {/* "+ קטגוריה" הועבר לתחתית רשימת המלאי, מתחת לכל הקטגוריות */}
      <Button type="button" variant="ghost" size="sm" className="mt-3 text-primary" onClick={() => setAddingCat(true)}>
        <Plus className="h-4 w-4" />קטגוריה
      </Button>


      <InventoryAssistant open={assistantOpen} onOpenChange={setAssistantOpen} items={items} onItemFound={focusItem} />

      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl border-border bg-card">
          <DrawerHeader className="text-right sm:text-right">
            <DrawerTitle className="text-xl">{editing?.name}</DrawerTitle>
            <DrawerDescription>נכנס למלאי: {editing ? formatDateTime(editing.createdAt) : ""} · {editing?.addedBy}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-2">
            {editing && familyId && onSetPhoto && inventoryCategoryOf(editing.name, editing.category) === "prepared-meal" && <MealPhotoPicker familyId={familyId} value={editing.photoUrl} onChange={(p) => { onSetPhoto(editing.id, p); setEditing({ ...editing, photoUrl: p }); }} />}
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">סטטוס</p>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_STATUS.map((x) => (
                  <Button key={x.id} type="button" variant={draft.stockStatus === x.id ? "default" : "outline"} onClick={() => setDraft((d) => ({ ...d, stockStatus: x.id }))}>
                    <span className={`h-2.5 w-2.5 rounded-full ${x.dot}`} />{x.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-sm font-medium text-foreground">כמות
                <input type="number" min={0} step="any" value={draft.quantity} onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-foreground">יחידה
                <input value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} placeholder="יח׳, ק״ג..." className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">תאריך תפוגה
              <input type="date" value={draft.expiryDate} onChange={(e) => setDraft((d) => ({ ...d, expiryDate: e.target.value }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">קטגוריה
              <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
                {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </label>
          </div>
          <DrawerFooter className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <DrawerClose asChild><Button type="button" variant="ghost">ביטול</Button></DrawerClose>
            <Button type="button" size="lg" onClick={() => { if (editing) onUpdate(editing.id, { ...draft, expiryDate: draft.expiryDate || null }); setEditing(null); }}>שמירה</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={addingMeal} onOpenChange={(open) => { setAddingMeal(open); if (!open) setMealName(""); }}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl border-border bg-card">
          <DrawerHeader className="text-right sm:text-right">
            <DrawerTitle className="flex items-center gap-2 text-xl"><CookingPot className="h-5 w-5 text-primary" />הוספת מנה מוכנה</DrawerTitle>
            <DrawerDescription>אוכל שהכנת, קיבלת או קנית יישמר ישירות במלאי.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={(event) => { event.preventDefault(); addMeal(); }}>
            <div className="px-4 pb-2">
              <label className="block space-y-1.5 text-sm font-medium text-foreground">
                שם המנה
                <input autoFocus value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="לדוגמה: 3 מנות מרק ירקות" className="h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">אפשר לציין כמות בשם, למשל „2 מנות לזניה”.</p>
              {familyId && <div className="mt-3"><MealPhotoPicker familyId={familyId} value={mealPhoto} onChange={setMealPhoto} /></div>}
            </div>
            <DrawerFooter className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <DrawerClose asChild><Button type="button" variant="ghost">ביטול</Button></DrawerClose>
              <Button type="submit" size="lg" disabled={!mealName.trim()}>הוספה למלאי</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      <Drawer open={addingCat} onOpenChange={setAddingCat}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl border-border bg-card">
          <DrawerHeader className="text-right sm:text-right">
            <DrawerTitle className="text-xl">קטגוריה חדשה</DrawerTitle>
            <DrawerDescription>הקטגוריה תישמר במכשיר ותהיה זמינה לשיוך מוצרים.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveCat(); }}>
            <div className="space-y-3 px-4 pb-2">
              <input autoFocus value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={30} placeholder="שם הקטגוריה" className="h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring" />
              <div className="flex flex-wrap gap-2">
                {["🏷️", "🍼", "🐶", "🍷", "🥜", "🍣", "🧁", "💊", "🎉", "🌶️"].map((e) => (
                  <button key={e} type="button" onClick={() => setCatEmoji(e)} className={`grid h-10 w-10 place-items-center rounded-md border text-xl ${catEmoji === e ? "border-primary bg-primary/10" : "border-border"}`}>{e}</button>
                ))}
              </div>
            </div>
            <DrawerFooter className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <DrawerClose asChild><Button type="button" variant="ghost">ביטול</Button></DrawerClose>
              <Button type="submit" size="lg" disabled={!catName.trim()}>הוספה</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {onlineBought.length > 0 && (
        <section aria-label="הזמנות אונליין" className="mt-4 rounded-2xl border border-border bg-card p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Truck className="h-4 w-4" />הזמנות אונליין ({onlineBought.length})</h3>
          <ul className="space-y-1.5">
            {onlineBought.map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-xl border border-border p-1.5">
                {w.image && <img src={w.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                <span className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium">{w.title}</span><span className="text-xs text-muted-foreground">{w.store} · {w.price}</span></span>
                <Button type="button" size="sm" variant="outline" onClick={() => { if (onAddToInventory(w.title, inventoryCategoryOf(w.title, ""))) { onOnlineDelivered?.(w.id); toast.success("הועבר למלאי"); } }}>📦 הגיע</Button>
              </li>
            ))}
          </ul>
        </section>
      )}


      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>{many ? "האם ברצונך להוסיף את המוצרים שוב לרשימת הקניות?" : "האם ברצונך להוסיף את המוצר שוב לרשימת הקניות?"}</AlertDialogTitle>
            <AlertDialogDescription>בחירה ב„לא” תמחק לצמיתות.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction onClick={() => { if (pending) onRestore(pending); setPending(null); }}>כן, החזר לרשימה</AlertDialogAction>
            <AlertDialogCancel onClick={() => { if (pending) onDelete(pending); setPending(null); }} className="text-destructive">לא, מחק</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
