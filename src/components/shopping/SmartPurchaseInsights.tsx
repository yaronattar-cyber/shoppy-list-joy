import { useMemo } from "react";
import { Plus, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compareBasket, restockRecommendations, type UnitPrice, type UsageEvent, type Recommendation } from "@/lib/smart-purchases";
import type { HistoryEntry } from "@/lib/product-history";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = { inventory: ShoppingItem[]; active: ShoppingItem[]; basket: ShoppingItem[]; history: HistoryEntry[]; usage: UsageEvent[]; prices: UnitPrice[]; stores: { id: string; name: string }[]; onAdd: (item: Recommendation) => void; loading?: boolean; error?: boolean };
const money = (value: number, currency: string) => new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(value);
export function SmartPurchaseInsights(p: Props) {
  const suggestions = useMemo(() => restockRecommendations(p.inventory, p.active, p.history, p.usage, new Date()), [p.inventory, p.active, p.history, p.usage]);
  const comparisons = useMemo(() => compareBasket(p.basket, p.stores, p.prices), [p.basket, p.stores, p.prices]);
  return <div className="mt-2 space-y-2 text-sm">
    {suggestions.length > 0 && <section aria-label="מומלץ לקנות" className="border-b border-border pb-2">
      <h2 className="mb-1 font-semibold">מומלץ לקנות</h2>
      <ul className="divide-y divide-border">{suggestions.map((item) => <li key={item.name} className="flex items-center gap-2 py-1">
        <div className="min-w-0 flex-1"><span className="font-medium">{item.name} · {item.quantity} {item.unit}</span><p className="text-xs text-muted-foreground">{item.reason}</p></div>
        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" aria-label={`הוסף המלצה ${item.name}`} title={`הוסף ${item.name}`} onClick={() => p.onAdd(item)}><Plus className="h-4 w-4" /></Button>
      </li>)}</ul>
    </section>}
    <details className="border-b border-border pb-2">
      <summary className="cursor-pointer font-semibold">השוואת סל לפי חשבוניות</summary>
      <p className="my-1 text-xs text-muted-foreground">הערכה בלבד · המחירים משוערים ואינם מתעדכנים מהרשתות</p>
      {p.loading && <p role="status" className="text-xs text-muted-foreground">טוען מחירים היסטוריים...</p>}
      {p.error && <p role="alert" className="text-xs text-destructive">לא ניתן לטעון מחירים היסטוריים כרגע</p>}
      {!p.loading && !p.error && !comparisons.length && <p className="text-xs text-muted-foreground">אין עדיין מחירי חשבוניות להשוואה</p>}
      {comparisons.map((group) => <section key={group.currency} className="mt-2 space-y-1" aria-label={`השוואה ${group.currency}`}>
        {group.estimates.map((estimate) => <details key={estimate.store.id} className="py-1">
          <summary className="cursor-pointer">{estimate.store.name} · {estimate.lines.length ? money(estimate.total, group.currency) : "אין מחיר"} {estimate.missing > 0 ? `(סל חלקי · חסרים ${estimate.missing} מחירים)` : "· סל מלא"}</summary>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">{estimate.lines.map((line) => <li key={line.id}>{line.name} · {line.quantity} × {money(line.unitPrice, group.currency)} = {money(line.cost, group.currency)} · {line.date}</li>)}</ul>
        </details>)}
        {group.comparisons.map((comparison) => <p key={comparison.other} className="flex items-center gap-1 text-xs text-primary"><TrendingDown className="h-4 w-4 shrink-0" />{comparison.cheaper} זולה ב־{comparison.percent}% מ{comparison.other} עבור הסל הנוכחי</p>)}
        {group.optimized.length > 0 && <details className="pt-1"><summary className="cursor-pointer text-xs font-semibold">סל מפוצל בין חנויות · {money(group.optimizedTotal, group.currency)}{group.optimized.length < group.totalItems ? " · חלקי" : ""}</summary><ul className="mt-1 text-xs text-muted-foreground">{group.optimized.map((line) => <li key={line.id}>{line.name} · {line.store} · {money(line.cost, group.currency)}</li>)}</ul><p className="text-xs text-muted-foreground">ללא עלויות משלוח ונסיעה</p></details>}
      </section>)}
    </details>
  </div>;
}