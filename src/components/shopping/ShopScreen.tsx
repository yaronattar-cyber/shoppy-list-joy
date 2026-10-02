import { useMemo } from "react";
import { basketTotals, formatPrice } from "@/lib/prices";
import { formatQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onBack: () => void;
};

// מסך 3 — קניות והשוואת מחירים
export function ShopScreen({ items, onToggle, onBack }: Props) {
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
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={item.completed}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-foreground bg-card p-4 text-start active:scale-[0.98]"
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] text-lg font-black ${
                  item.completed ? "border-primary bg-primary text-primary-foreground" : "border-foreground text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={`text-lg font-bold ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.name}
              </span>
              {formatQuantity(item.quantity, item.unit) && (
                <span className="ms-auto rounded-lg bg-secondary px-2.5 py-1 text-sm font-black text-foreground">
                  {formatQuantity(item.quantity, item.unit)}
                </span>
              )}
            </button>
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
