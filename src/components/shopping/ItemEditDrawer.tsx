import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CATEGORIES } from "@/lib/categories";
import { UNITS, stepFor } from "@/lib/quantity";
import { formatDateTime, type ShoppingItem } from "@/lib/shopping-list";

type Props = {
  item: ShoppingItem | null;
  stores?: { id: string; name: string }[];
  onClose: () => void;
  onSave: (id: string, details: { name: string; quantity: number; unit: string; notes: string; category: string; storeId?: string | null }) => void;
  onDelete: (id: string) => void;
  onOutOfStock?: (id: string) => void;
};

const field = "h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring";

export function ItemEditDrawer({ item, stores = [], onClose, onSave, onDelete, onOutOfStock }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setNotes(item.notes);
    setCategory(item.category);
    setStoreId(item.storeId ?? "");
  }, [item]);

  return (
    <Drawer open={Boolean(item)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DrawerContent dir="rtl" className="mx-auto max-h-[92vh] max-w-xl rounded-t-2xl border-border bg-card">
        <DrawerHeader className="text-right sm:text-right">
          <DrawerTitle className="text-xl text-foreground">עריכת פריט</DrawerTitle>
          <DrawerDescription>{item ? `נוצר ע״י ${item.addedBy || "אנונימי"} ב־${formatDateTime(item.createdAt)}` : ""}</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-2">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">שם המוצר
            <textarea rows={2} className="w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-base text-foreground outline-none focus:ring-2 focus:ring-ring" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.7fr)] gap-3">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-foreground">כמות</span>
              <div className="grid h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-md border border-input bg-card">
                <Button type="button" variant="ghost" size="icon" aria-label="הפחתת כמות" onClick={() => setQuantity((q) => Math.max(stepFor(unit), +(q - stepFor(unit)).toFixed(2)))}><Minus /></Button>
                <input type="number" min="0.1" step="0.1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="min-w-0 bg-transparent text-center font-semibold outline-none" aria-label="כמות" />
                <Button type="button" variant="ghost" size="icon" aria-label="הוספת כמות" onClick={() => setQuantity((q) => +(q + stepFor(unit)).toFixed(2))}><Plus /></Button>
              </div>
            </div>
            <label className="space-y-1.5 text-sm font-medium text-foreground">יחידה
              <select className={field} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((value) => <option key={value} value={value}>{value || "ללא"}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">מותג, גודל או הערה
            <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="לדוגמה: ללא סוכר, אריזה גדולה" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">קטגוריה
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">ללא קטגוריה</option>
              {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">שיוך לחנות
            <select className={field} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">כללי</option>
              {stores.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </label>
        </div>
        {item && onOutOfStock && !item.completed && (
          <div className="px-4">
            <Button type="button" variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { onOutOfStock(item.id); onClose(); }}>
              {item.outOfStock ? "ביטול „חסר במלאי”" : "סימון „חסר במלאי”"}
            </Button>
          </div>
        )}
        <DrawerFooter className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { if (item) onDelete(item.id); onClose(); }}><Trash2 />מחיקה</Button>
          <DrawerClose asChild>
            <Button type="button" size="lg" onClick={() => { if (item && name.trim() && quantity > 0) onSave(item.id, { name: name.trim(), quantity, unit, notes: notes.trim(), category, storeId: storeId || null }); }}>שמירת שינויים</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}