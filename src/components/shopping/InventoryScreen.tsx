import { useState } from "react";
import { CookingPot, Package, Plus, Trash2 } from "lucide-react";
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
};

// מסך מלאי — מוצרים שנקנו; מחיקה שואלת אם להחזיר לרשימת הקניות
export function InventoryScreen({ items, onRestore, onDelete, onAddPreparedMeal }: Props) {
  const [pending, setPending] = useState<string[] | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [mealName, setMealName] = useState("");
  const many = (pending?.length ?? 0) > 1;

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

      {items.length > 0 ? (
        <ul className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
              <span className="min-w-0 text-right">
                <span className="block break-words text-base font-semibold leading-6 text-foreground">{item.name}</span>
                <span className="block text-xs text-muted-foreground">{item.addedBy} · {formatDateTime(item.createdAt)}</span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">{formatQuantity(item.quantity, item.unit) || "×1"}</span>
              <Button type="button" size="icon" variant="ghost" aria-label={`מחיקת ${item.name}`} onClick={() => setPending([item.id])} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-12 text-center text-muted-foreground"><Package className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>מוצרים שנקנו או מנות מוכנות יופיעו כאן</p></div>
      )}

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
