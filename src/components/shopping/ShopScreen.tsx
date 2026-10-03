import { useMemo } from "react";
import { basketTotals, formatPrice } from "@/lib/prices";
import { UNITS, formatQuantity, stepFor } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onQuantity: (id: string, quantity: number, unit?: string) => void;
  onBack: () => void;
};

// מסך 3 — קניות והשוואת מחירים
export function ShopScreen({ items, onToggle, onQuantity, onBack }: Props) {
  const totals = useMemo(() => basketTotals(items.map((i) => i.name)), [items]);
  const best = totals[0];
  const left = items.filter((i) => !i.completed).length;

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16 pt-10">
      <h1 className="text-3xl font-black text-foreground">בסופר 🛒</h1>
      <p className="mt-1 text-sm text-muted-foreground">נשארו {left} פריטים</p>

      {items.length > 0 && best && (
        <div className="mt-5 rounded-3xl border-[3px] border-foreground bg-accent p-5 shadow-[5px_5px_0_0_var(--color-foreground)]">
          <p className="text-lg font-black text-accent-foreground">
            הסל הזול ביותר: {best.store} - {formatPrice(best.total)} ₪
          </p>
          <ul className="mt-3 space-y-1 text-sm text-accent-foreground">
            {totals.slice(1).map((t) => (
              <li key={t.store} className="flex justify-between">
                <span>{t.store}</span>
                <span>{formatPrice(t.total)} ₪</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-accent-foreground/70">המחירים הם הערכה בלבד.</p>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-3.5"
          >
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={item.completed}
              aria-label={item.completed ? "בטל סימון" : "סמן כנקנה"}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] text-lg font-black transition-all active:scale-90 ${
                item.completed ? "border-primary bg-primary text-primary-foreground" : "border-foreground text-transparent"
              }`}
            >
              ✓
            </button>
            <span
              className={`min-w-0 flex-1 truncate text-lg font-bold ${
                item.completed ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {item.name}
            </span>
            <div className="flex shrink-0 items-center gap-1" aria-label="כמות">
              <button
                type="button"
                aria-label="הפחתת כמות"
                disabled={item.quantity <= stepFor(item.unit)}
                onClick={() => onQuantity(item.id, +(item.quantity - stepFor(item.unit)).toFixed(2))}
                className="grid h-9 w-9 place-items-center rounded-lg border-2 border-foreground text-lg font-black disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-9 text-center text-sm font-black text-foreground">
                {item.quantity === 0.5 ? "½" : Number(item.quantity.toFixed(2))}
              </span>
              <button
                type="button"
                aria-label="הוספת כמות"
                onClick={() => onQuantity(item.id, +(item.quantity + stepFor(item.unit)).toFixed(2))}
                className="grid h-9 w-9 place-items-center rounded-lg border-2 border-foreground text-lg font-black"
              >
                +
              </button>
              <select
                value={item.unit}
                aria-label="יחידה"
                onChange={(e) => onQuantity(item.id, item.quantity, e.target.value)}
                className="h-9 rounded-lg border-2 border-foreground bg-background px-1 text-xs font-bold"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u || "—"}</option>
                ))}
              </select>
            </div>
            {formatQuantity(item.quantity, item.unit) && item.completed && (
              <span className="w-full text-xs text-muted-foreground">
                נקנה: {formatQuantity(item.quantity, item.unit)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">אין מה לקנות כרגע 🎉</p>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-8 w-full rounded-2xl border-[3px] border-foreground bg-card px-4 py-3 font-black text-foreground"
      >
        חזרה לרשימה
      </button>
    </section>
  );
}
