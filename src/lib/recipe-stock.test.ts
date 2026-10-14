/// <reference types="bun" />
import { test, expect } from "bun:test";
import { missingIngredientIndexes, scaledAmount } from "./recipe-stock";
test("servings scale ingredient amounts", () => {
  expect(scaledAmount({ item_name: "קמח", amount: 200, unit: "גרם" }, 1.5)).toBe(300);
});
test("preselect only absent or insufficient stock", () => {
  const ingredients = [ { item_name: "ביצים", amount: 2, unit: "יח׳" }, { item_name: "קמח", amount: 200, unit: "גרם" }, { item_name: "חלב", amount: 1, unit: "ליטר" } ];
  expect([...missingIngredientIndexes(ingredients, [{ id: "1", name: "ביצים", quantity: 4, unit: "יח׳" }, { id: "2", name: "קמח", quantity: 100, unit: "גרם" }], 1)]).toEqual([1, 2]);
});
test("incompatible units cannot satisfy ingredient stock", () => {
  expect([...missingIngredientIndexes([{ item_name: "קמח", amount: 200, unit: "גרם" }], [{ id: "1", name: "קמח", quantity: 2, unit: "שקיות" }], 1)]).toEqual([0]);
});