import { test } from "node:test";
import { strict as assert } from "node:assert";
import { crossStoreDuplicates, importantFirst, missingEventItems, type ShoppingItem } from "./shopping-list";

const item = (id: string, details: Partial<ShoppingItem> = {}): ShoppingItem => ({ id, name: "חלב", familyId: "family", storeId: "rami", quantity: 1, unit: "ליטר", notes: "", category: "", completed: false, archived: false, outOfStock: false, addedBy: "", createdAt: "2026-10-01T00:00:00Z", ...details });
test("urgent items precede recent and standard items", () => {
  assert.deepEqual(importantFirst([item("standard"), item("recent", { createdAt: "2026-10-15T00:00:00Z" }), item("urgent", { isUrgent: true })]).map((i) => i.id), ["urgent", "recent", "standard"]);
});
test("purchase and clear target same product in other stores only", () => {
  assert.deepEqual(crossStoreDuplicates([item("other", { storeId: "shufersal", name: " חלב " }), item("same"), item("different", { storeId: "shufersal", name: "לחם" }), item("inventory", { storeId: "shufersal", archived: true })], item("source")).map((i) => i.id), ["other"]);
});
test("special events and other families are never cross-store deletion targets", () => {
  assert.deepEqual(crossStoreDuplicates([item("birthday", { familyId: "birthday", storeId: "shufersal" }), item("barbecue", { familyId: "barbecue", storeId: null }), item("other-family", { familyId: "else", storeId: "shufersal" })], item("source")), []);
});
test("event export copies only remaining deficits and keeps originals", () => {
  const event = [item("missing", { quantity: 3 }), item("bought", { completed: true })];
  assert.equal(missingEventItems(event, [item("stock", { quantity: 1, archived: true })], [item("queued")])[0]?.quantity, 1);
  assert.equal(event[0]?.quantity, 3);
  assert.equal(event.length, 2);
});