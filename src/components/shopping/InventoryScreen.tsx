import { RecipesDrawer } from "./RecipesDrawer";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { STOCK_STATUS, addCustomCategory, inventoryCategoryOf, useInvCategories } from "@/lib/inventory-categories";
import { Check, CookingPot, Package, Plus, ScanBarcode, Trash2, X } from "lucide-react";
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
import { formatQuantity } from "@/lib/quantity";
import { formatDateTime, type ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  onRestore: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onAddPreparedMeal: (name: string) => boolean;
  onAddMissing: (names: string[]) => void;
  onUpdate: (id: string, d: { expiryDate: string | null; stockStatus: string; quantity: number; unit: string; category: string }) => void;
  onAddToInventory: (name: string, category: string) => boolean;
};

const daysLeft = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
// פיצול טקסט חופשי לפריטים: פסיקים או שורות חדשות
const splitItems = (s: string) => s.split(/[,،\n]+/).map((x) => x.trim()).filter(Boolean);

// מסך מלאי — מוצרים שנקנו; מחיקה שואלת אם להחזיר לרשימת הקניות
export function InventoryScreen({ items, onRestore, onDelete, onAddPreparedMeal, onUpdate, onAddMissing, onAddToInventory }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [draft, setDraft] = useState({ expiryDate: "", stockStatus: "full", quantity: 1, unit: "", category: "other" });
  const cats = useInvCategories();
  const groups = useMemo(() => cats.map((c) => ({ ...c, items: items.filter((i) => inventoryCategoryOf(i.name, i.category) === c.id) })).filter((g) => g.items.length || g.id === "prepared-meal" || g.id.startsWith("custom-")), [items, cats]);
  const openItem = (i: ShoppingItem) => { setEditing(i); setDraft({ expiryDate: i.expiryDate ?? "", stockStatus: i.stockStatus ?? "full", quantity: i.quantity, unit: i.unit, category: inventoryCategoryOf(i.name, i.category) }); };
  const [pending, setPending] = useState<string[] | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("🏷️");
  const many = (pending?.length ?? 0) > 1;
  const saveCat = () => { if (addCustomCategory(catName, catEmoji)) { setCatName(""); setCatEmoji("🏷️"); setAddingCat(false); } };
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [addingProducts, setAddingProducts] = useState(false); // אקורדיון "הוספת מוצר/ים" סגור כברירת מחדל
  const [drafts, setDrafts] = useState<{ name: string; category: string }[]>([]);

  const appendText = (s: string) => setText((t) => (t.trim() ? `${t.trim()}\n${s}` : s));
  const addDirect = () => { const list = splitItems(text); const ok = list.filter((n) => onAddToInventory(n, inventoryCategoryOf(n, ""))).length; if (ok) toast.success(`${ok} מוצרים נוספו למלאי`); setText(""); };
  const addToDrafts = () => { setDrafts((l) => [...l, ...splitItems(text).map((n) => ({ name: n, category: inventoryCategoryOf(n, "") }))]); setText(""); };
  const approveDraft = (idx: number) => { const d = drafts[idx]; if (d && onAddToInventory(d.name, d.category)) setDrafts((l) => l.filter((_, j) => j !== idx)); };

  const addMeal = () => {
    if (!onAddPreparedMeal(mealName)) return;
    setMealName("");
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
          <Button type="button" size="icon" aria-label="הוספת מנה מוכנה למלאי" title="הוספת מנה מוכנה" onClick={() => setAddingMeal(true)} className="h-10 w-10 rounded-full">
            <span className="relative"><CookingPot className="h-5 w-5" /><Plus className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-primary-foreground text-primary" /></span>
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={!items.length} onClick={() => setPending(items.map((i) => i.id))} className="text-destructive hover:text-destructive">
            <Trash2 />ניקוי הכל
          </Button>
        </div>
      </header>

      <Button type="button" variant="outline" className="mt-4 h-12 w-full justify-start border-primary/30 bg-card text-primary shadow-sm hover:bg-primary/5 hover:text-primary" onClick={() => setAddingMeal(true)}>
        <CookingPot className="h-5 w-5" />
        הוספת מנה מוכנה למלאי
      </Button>

      {/* קלט גמיש: מוצר אחד או כמה, מופרדים בפסיק או בשורה */}
      <div className="mt-3 rounded-lg border border-border bg-card p-2 shadow-sm">
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
      <BarcodeScanner open={scanning} onClose={() => setScanning(false)} onResult={(n) => { appendText(n); setScanning(false); }} />

      <RecipesDrawer names={items.map((i) => i.name)} onAddMissing={onAddMissing} />

      <Button type="button" variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setAddingCat(true)}>
        <Plus className="h-4 w-4" />קטגוריה
      </Button>

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
                      <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                        <button type="button" onClick={() => openItem(item)} className="min-w-0 text-right">
                          <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} title={st.label} /><span className="break-words text-base font-semibold leading-6 text-foreground">{item.name}</span></span>
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

      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl border-border bg-card">
          <DrawerHeader className="text-right sm:text-right">
            <DrawerTitle className="text-xl">{editing?.name}</DrawerTitle>
            <DrawerDescription>נכנס למלאי: {editing ? formatDateTime(editing.createdAt) : ""} · {editing?.addedBy}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-2">
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
