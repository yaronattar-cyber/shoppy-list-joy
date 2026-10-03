import { useState } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { ItemEditDrawer } from "./ItemEditDrawer";
import { ShoppingItemRow } from "./ShoppingItemRow";
import type { ShoppingItem } from "@/lib/shopping-list";

type ItemDetails = { name: string; quantity: number; unit: string; notes: string; category: string };
type Props = {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, details: ItemDetails) => void;
  onRemove: (id: string) => void;
};

export function ShopScreen({ items, onToggle, onUpdate, onRemove }: Props) {
  const [selected, setSelected] = useState<ShoppingItem | null>(null);
  const todo = items.filter((item) => !item.completed);
  const done = items.filter((item) => item.completed);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-5 sm:px-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0"><h1 className="text-2xl font-bold text-foreground">קניות</h1><p className="mt-0.5 text-sm text-muted-foreground">נשארו {todo.length} מוצרים</p></div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"><ShoppingCart className="h-5 w-5" /></span>
      </header>

      <ul className="mt-5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {todo.map((item) => <ShoppingItemRow key={item.id} item={item} onToggle={onToggle} onOpen={setSelected} />)}
      </ul>
      {!todo.length && <div className="py-12 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" /><p className="font-medium">הכול בעגלה</p></div>}

      {done.length > 0 && <section className="mt-7"><div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><h2 className="text-sm font-semibold text-muted-foreground">נקנו ({done.length})</h2><span className="h-px bg-border" /></div><ul className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">{done.map((item) => <ShoppingItemRow key={item.id} item={item} onToggle={onToggle} onOpen={setSelected} />)}</ul></section>}

      <ItemEditDrawer item={selected} onClose={() => setSelected(null)} onSave={onUpdate} onDelete={onRemove} />
    </section>
  );
}