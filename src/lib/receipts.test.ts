import { test } from "node:test";
import { strict as assert } from "node:assert";
import { monthlyExpenses, matchReceiptItem, receiptSchema } from "./receipts";
import { visionErrorMessage } from "./ai/vision-errors";
import type { ShoppingItem } from "./shopping-list";
const item = (id: string, name: string, storeId: string): ShoppingItem => ({ id, name, storeId, familyId: "home", completed: true, archived: true, outOfStock: false, quantity: 1, unit: "", notes: "", category: "", addedBy: "", createdAt: "" });
test("402 and 429 use requested Hebrew quota message", () => {
  for (const status of [402,429]) assert.equal(visionErrorMessage(status), "מכסת ה-AI הסתיימה או שחלה שגיאה בחיבור, אנא נסה שוב מאוחר יותר");
});
test("prices match exact normalized products within selected store without ambiguous guesses", () => {
  const rows = [item("a", "Milk", "one"), item("b", "Milk", "two")];
  assert.equal(matchReceiptItem(" milk ", rows, "one"), "a");
  assert.equal(matchReceiptItem("Milk", rows), null);
  assert.equal(matchReceiptItem("Milk powder", rows, "one"), null);
});
test("monthly total includes paid receipt totals only in the month and separates currencies", () => {
  assert.deepEqual(monthlyExpenses([{ purchase_date: "2026-10-01", total_amount: 25.5, currency: "ILS" }, { purchase_date: "2026-10-18", total_amount: 14.5, currency: "ILS" }, { purchase_date: "2026-09-30", total_amount: 100, currency: "ILS" }, { purchase_date: "2026-10-01", total_amount: 3, currency: "USD" }], "2026-10"), { ILS: 40, USD: 3 });
});
test("receipt validates actual date and nonnegative unit prices", () => {
  const receipt = { store_name: "חנות", purchase_date: "2026-10-18", total_amount: 40, currency: "ILS", items: [{ name: "חלב", quantity: 2, unit_price: 20 }] };
  assert.equal(receiptSchema.safeParse(receipt).success, true);
  assert.equal(receiptSchema.safeParse({ ...receipt, purchase_date: "2026-02-30" }).success, false);
  assert.equal(receiptSchema.safeParse({ ...receipt, items: [{ name: "חלב", quantity: 2, unit_price: -1 }] }).success, false);
});
