import { test } from "node:test";
import { strict as assert } from "node:assert";
import { missingIngredientIndexes, missingRecipeIngredients, scaledAmount } from "./recipe-stock";
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
test("only missing quantities are purchased, including already queued shopping quantities", () => {
  const ingredients = [{ item_name: "קמח", amount: 200, unit: "גרם" }, { item_name: "ביצים", amount: 2, unit: "יח׳" }];
  const available = [{ id: "stock", name: "קמח", quantity: 100, unit: "גרם" }, { id: "queued", name: "קמח", quantity: 50, unit: "גרם" }, { id: "eggs", name: "ביצים", quantity: 4, unit: "יח׳" }];
  assert.deepEqual(missingRecipeIngredients(ingredients, available, 1), [{ item_name: "קמח", amount: 50, unit: "גרם" }]);
});
test("duplicate ingredients share stock and merge deficit quantities", () => {
  assert.deepEqual(missingRecipeIngredients([{ item_name: "קמח", amount: 100, unit: "גרם" }, { item_name: " קמח ", amount: 100, unit: "גרם" }], [{ id: "1", name: "קמח", quantity: 50, unit: "גרם" }], 1), [{ item_name: " קמח ", amount: 150, unit: "גרם" }]);
});
test("adding the same recipe twice yields no new shopping deficits", () => {
  const ingredients = [{ item_name: "קמח", amount: 200, unit: "גרם" }];
  const stock = [{ id: "1", name: "קמח", quantity: 100, unit: "גרם" }];
  const missing = missingRecipeIngredients(ingredients, stock, 1);
  assert.deepEqual(missingRecipeIngredients(ingredients, [...stock, ...missing.map((i) => ({ id: "queued", name: i.item_name, quantity: i.amount ?? 1, unit: i.unit }))], 1), []);
});