import type { ShoppingItem } from "./shopping-list";
import type { HistoryEntry } from "./product-history";
import { normalizeStockName } from "./recipe-stock";

export type UsageEvent = { name: string; unit: string; category: string; quantity: number; remaining: number; expiry_date: string | null; created_at: string };
export type UnitPrice = { store_id: string | null; store_name: string; name: string; unit: string; unit_price: number; currency: string; purchase_date: string };
export type Recommendation = { name: string; unit: string; quantity: number; category: string; reason: string; score: number };
const key = (name: string, unit: string) => `${normalizeStockName(name)}\u0000${normalizeStockName(unit)}`;
const DAY = 86400000;
export const localDay = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
export const usableStock = (inventory: ShoppingItem[], today: string) => inventory.filter((i) => i.quantity > 0 && !i.outOfStock && (!i.expiryDate || i.expiryDate >= today));

export function restockRecommendations(inventory: ShoppingItem[], active: ShoppingItem[], history: HistoryEntry[], usage: UsageEvent[], now: Date): Recommendation[] {
  const today = localDay(now);
  const listed = new Set(active.map((i) => normalizeStockName(i.name)));
  const candidates = new Map<string, Recommendation>();
  const stock = new Map<string, ShoppingItem[]>();
  for (const i of inventory) stock.set(key(i.name, i.unit), [...(stock.get(key(i.name, i.unit)) ?? []), i]);
  const offer = (item: Recommendation) => {
    if (listed.has(normalizeStockName(item.name))) return;
    const previous = candidates.get(normalizeStockName(item.name));
    if (!previous || previous.score < item.score) candidates.set(normalizeStockName(item.name), item);
  };
  for (const [k, rows] of stock) {
    const first = rows[0];
    if (!first) continue;
    const usable = usableStock(rows, today);
    const amount = usable.reduce((sum, i) => sum + i.quantity, 0);
    const recent = usage.filter((e) => key(e.name, e.unit) === k && now.getTime() - Date.parse(e.created_at) <= 30 * DAY && e.expiry_date !== e.created_at.slice(0, 10) && (!e.expiry_date || e.expiry_date >= e.created_at.slice(0, 10)));
    const consumed = recent.reduce((sum, e) => sum + e.quantity, 0);
    const observedDays = recent.length ? Math.max(7, Math.min(30, (now.getTime() - Math.min(...recent.map((e) => Date.parse(e.created_at)))) / DAY)) : 30;
    const weeklyNeed = Math.round(consumed / observedDays * 7 * 100) / 100;
    const soon = usable.some((i) => i.expiryDate && (Date.parse(i.expiryDate) - Date.parse(today)) / DAY <= 3);
    const low = amount <= 1 || (usable.length > 0 && usable.every((i) => i.stockStatus === "low")) || (weeklyNeed > 0 && amount < weeklyNeed);
    if (amount === 0 || soon || low) offer({ name: first.name, unit: first.unit, category: first.category, quantity: Math.max(1, Math.round((weeklyNeed - (soon ? 0 : amount)) * 100) / 100), reason: amount === 0 ? "המלאי נגמר או פג תוקף" : soon ? "תפוגה בתוך 3 ימים" : weeklyNeed > amount ? "לפי קצב השימוש האחרון" : "מלאי נמוך", score: amount === 0 ? 100 : soon ? 80 : 60 });
  }
  for (const event of usage) {
    if (stock.has(key(event.name, event.unit))) continue;
    const expired = !!event.expiry_date && event.expiry_date <= event.created_at.slice(0, 10);
    const frequent = history.some((h) => normalizeStockName(h.name) === normalizeStockName(event.name) && h.count >= 2);
    if (event.remaining === 0 && now.getTime() - Date.parse(event.created_at) <= 30 * DAY) offer({ name: event.name, unit: event.unit, category: event.category, quantity: 1, reason: expired ? "אזל אחרי תפוגה" : frequent ? "נרכש בקביעות והמלאי אזל" : "המלאי אזל לאחרונה", score: frequent ? 95 : 85 });
  }
  return [...candidates.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "he")).slice(0, 8);
}

export function compareBasket(basket: ShoppingItem[], stores: { id: string; name: string }[], prices: UnitPrice[]) {
  const todo = basket.filter((i) => !i.completed && !i.archived);
  const currencies = [...new Set(prices.map((p) => p.currency))];
  return currencies.map((currency) => {
    const estimates = stores.map((store) => {
      const lines = todo.flatMap((item) => {
        const price = prices.filter((p) => p.currency === currency && key(p.name, p.unit) === key(item.name, item.unit) && (p.store_id === store.id || (!p.store_id && normalizeStockName(p.store_name) === normalizeStockName(store.name) && stores.filter((s) => normalizeStockName(s.name) === normalizeStockName(store.name)).length === 1))).sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))[0];
        return price ? [{ id: item.id, name: item.name, quantity: item.quantity, unitPrice: price.unit_price, cost: Math.round(price.unit_price * item.quantity * 100) / 100, date: price.purchase_date }] : [];
      });
      return { store, lines, total: Math.round(lines.reduce((sum, line) => sum + line.cost, 0) * 100) / 100, missing: todo.length - lines.length };
    });
    const complete = estimates.filter((e) => e.missing === 0 && e.lines.length > 0).sort((a, b) => a.total - b.total);
    const cheapest = complete[0];
    const comparisons = cheapest ? complete.slice(1).filter((e) => e.total > cheapest.total && e.total > 0).map((e) => ({ cheaper: cheapest.store.name, other: e.store.name, percent: Math.round((e.total - cheapest.total) / e.total * 100) })) : [];
    const optimized = todo.flatMap((i) => {
      const best = estimates.flatMap((e) => e.lines.filter((l) => l.id === i.id).map((line) => ({ ...line, store: e.store.name }))).sort((a, b) => a.cost - b.cost)[0];
      return best ? [best] : [];
    });
    return { currency, estimates, comparisons, optimized, optimizedTotal: Math.round(optimized.reduce((sum, line) => sum + line.cost, 0) * 100) / 100, totalItems: todo.length };
  });
}