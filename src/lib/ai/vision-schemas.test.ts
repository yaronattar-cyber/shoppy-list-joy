import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ingredientSchema } from "./vision-schemas";

describe("recipe ingredient units", () => {
  it("defaults a missing unit to an empty string for one egg", () => {
    assert.deepEqual(ingredientSchema.parse({ item_name: "ביצה", amount: 1 }), { item_name: "ביצה", amount: 1, unit: "" });
  });
  it("defaults a null unit to an empty string", () => {
    assert.equal(ingredientSchema.parse({ item_name: "ביצה", amount: 1, unit: null }).unit, "");
  });
  it("preserves an explicit unit", () => {
    assert.equal(ingredientSchema.parse({ item_name: "קמח", amount: 250, unit: "גרם" }).unit, "גרם");
  });
});