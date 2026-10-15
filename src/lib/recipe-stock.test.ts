import { test } from "node:test";
import { strict as assert } from "node:assert";
import { missingIngredientIndexes, scaledAmount } from "./recipe-stock";
test("servings scale ingredient amounts", () => {
  assert.equal(scaledAmount({ item_name: "קמח", amount: 200, unit: "גרם" }, 1.5), 300);
});
test("preselect only absent or insufficient stock", () => {
  const ingredients = [ { item_name: "ביצים", amount: 2, unit: "יח׳" }, { item_name: "קמח", amount: 200, unit: "גרם" }, { item_name: "חלב", amount: 1, unit: "ליטר" } ];
  assert.deepEqual([...missingIngredientIndexes(ingredients, [{ id: "1", name: "ביצים", quantity: 4, unit: "יח׳" }, { id: "2", name: "קמח", quantity: 100, unit: "גרם" }], 1)], [1, 2]);
});
test("incompatible units cannot satisfy ingredient stock", () => {
  assert.deepEqual([...missingIngredientIndexes([{ item_name: "קמח", amount: 200, unit: "גרם" }], [{ id: "1", name: "קמח", quantity: 2, unit: "שקיות" }], 1)], [0]);
});