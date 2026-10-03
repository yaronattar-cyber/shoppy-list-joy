import { useState } from "react";
import { Package, Trash2 } from "lucide-react";
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
import { formatQuantity } from "@/lib/quantity";
import { formatDateTime, type ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  onRestore: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
};

// מסך מלאי — מוצרים שנקנו; מחיקה שואלת אם להחזיר לרשימת הקניות
export function InventoryScreen({ items, onRestore, onDelete }: Props) {
  const [pending, setPending] = useState<string[] | null>(null);
  const many = (pending?.length ?? 0) > 1;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">מלאי</h1>
          <p className="text-sm text-muted-foreground">{items.length ? `${items.length} מוצרים שנקנו` : "אין מוצרים במלאי"}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={!items.length} onClick={() => setPending(items.map((i) => i.id))} className="text-destructive hover:text-destructive">
          <Trash2 />ניקוי כל המלאי
        </Button>
      </header>

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
        <div className="mt-12 text-center text-muted-foreground"><Package className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>מוצרים שנקנו ונוקו מהרשימה יופיעו כאן</p></div>
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
