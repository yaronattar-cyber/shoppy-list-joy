import { describe, expect, it } from "vitest";
import { ingredientSchema } from "./vision-schemas";

describe("recipe ingredient units", () => {
  it("defaults a missing unit to an empty string for one egg", () => {
    expect(ingredientSchema.parse({ item_name: "ביצה", amount: 1 })).toEqual({ item_name: "ביצה", amount: 1, unit: "" });
  });
  it("defaults a null unit to an empty string", () => {
    expect(ingredientSchema.parse({ item_name: "ביצה", amount: 1, unit: null }).unit).toBe("");
  });
  it("preserves an explicit unit", () => {
    expect(ingredientSchema.parse({ item_name: "קמח", amount: 250, unit: "גרם" }).unit).toBe("גרם");
  });
});