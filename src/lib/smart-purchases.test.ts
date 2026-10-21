import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compareBasket, restockRecommendations, usableStock, type UnitPrice, type UsageEvent } from "./smart-purchases";
import type { ShoppingItem } from "./shopping-list";
const now = new Date("2026-10-20T12:00:00Z");
const item = (patch: Partial<ShoppingItem> = {}): ShoppingItem => ({ id: "milk", name: "חלב", quantity: 1, unit: "ליטר", familyId: "home", category: "dairy", archived: true, completed: true, outOfStock: false, notes: "", addedBy: "", createdAt: now.toISOString(), ...patch });
const usage = (patch: Partial<UsageEvent> = {}): UsageEvent => ({ name: "חלב", unit: "ליטר", category: "dairy", quantity: 4, remaining: 0, expiry_date: null, created_at: "2026-10-13T12:00:00Z", ...patch });
test("low stock generates one-click restock quantity", () => {
  const suggestions = restockRecommendations([item()], [], [], [], now);
  assert.equal(suggestions[0]?.quantity, 1);
});
test("expiry within three days recommends replacement even with quantity remaining", () => {
  assert.equal(restockRecommendations([item({ quantity: 5, expiryDate: "2026-10-23" })], [], [], [], now)[0]?.reason, "תפוגה בתוך 3 ימים");
  assert.equal(restockRecommendations([item({ quantity: 5, expiryDate: "2026-10-24" })], [], [], [], now).length, 0);
});
test("usage cadence recommends weekly deficit", () => {
  assert.equal(restockRecommendations([item({ quantity: 2 })], [], [], [usage()], now)[0]?.quantity, 2);
});
test("depletion and expiry history survive removed inventory rows", () => {
  assert.equal(restockRecommendations([], [], [{ name: "חלב", count: 3, category: "dairy", lastUsed: now.getTime() }], [usage()], now)[0]?.reason, "נרכש בקביעות והמלאי אזל");
  assert.equal(restockRecommendations([], [], [], [usage({ expiry_date: "2026-10-12" })], now)[0]?.reason, "אזל אחרי תפוגה");
});
test("already listed items are never recommended again", () => {
  assert.equal(restockRecommendations([item()], [item({ name: " חלב ", archived: false })], [], [], now).length, 0);
});
test("expired and unavailable stock cannot fulfill a recipe", () => {
  assert.equal(usableStock([item({ expiryDate: "2026-10-19" }), item({ outOfStock: true }), item({ expiryDate: "2026-10-20" })], "2026-10-20").length, 1);
});
const stores = [{ id: "a", name: "א" }, { id: "b", name: "ב" }];
const price = (patch: Partial<UnitPrice> = {}): UnitPrice => ({ store_id: "a", store_name: "א", name: "חלב", unit: "ליטר", unit_price: 8.5, currency: "ILS", purchase_date: "2026-10-19", ...patch });
test("historical quantities calculate full basket and 15 percent savings", () => {
  const result = compareBasket([item({ archived: false, completed: false, quantity: 2 })], stores, [price(), price({ store_id: "b", unit_price: 10 })])[0];
  assert.equal(result?.estimates[0]?.total, 17);
  assert.equal(result?.comparisons[0]?.percent, 15);
  assert.equal(result?.optimizedTotal, 17);
});
test("completed products are excluded and newest unit price wins", () => {
  const result = compareBasket([item({ archived: false, completed: false }), item({ id: "done", archived: false })], stores, [price(), price({ unit_price: 5, purchase_date: "2026-10-18" })])[0];
  assert.equal(result?.totalItems, 1);
  assert.equal(result?.estimates[0]?.total, 8.5);
});
test("incompatible units and currencies never yield a false full basket comparison", () => {
  const result = compareBasket([item({ archived: false, completed: false })], stores, [price(), price({ store_id: "b", unit: "בקבוק" }), price({ store_id: "b", currency: "USD" })]);
  assert.equal(result[0]?.estimates[1]?.missing, 1);
  assert.equal(result[0]?.comparisons.length, 0);
  assert.equal(result[1]?.estimates[0]?.missing, 1);
});