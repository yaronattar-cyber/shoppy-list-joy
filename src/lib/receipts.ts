import { z } from "zod";
import type { ShoppingItem } from "./shopping-list";

export const receiptSchema = z.object({
  store_name: z.string().trim().min(1).max(200),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s),
  total_amount: z.number().finite().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  items: z.array(z.object({ name: z.string().trim().min(1).max(200), quantity: z.number().finite().positive(), unit_price: z.number().finite().nonnegative() })).max(200),
});
export type Receipt = z.infer<typeof receiptSchema>;
export function matchReceiptItem(name: string, items: ShoppingItem[], storeId?: string | null): string | null {
  const matches = items.filter((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
  const scoped = storeId ? matches.filter((item) => item.storeId === storeId) : matches;
  return scoped.length === 1 ? scoped[0]?.id ?? null : null;
}
export function monthlyExpenses(rows: { purchase_date: string; total_amount: number | string; currency: string }[], month: string) {
  const totals: Record<string, number> = {};
  for (const row of rows) if (row.purchase_date.startsWith(`${month}-`)) totals[row.currency] = (totals[row.currency] ?? 0) + Number(row.total_amount);
  return totals;
}