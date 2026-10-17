import { test } from "node:test";
import { strict as assert } from "node:assert";
import { byExpiry, expiryLevel, locationOf } from "./inventory-categories";

test("expiry badge: red up to 3 days or expired, yellow 4-7, green after", () => {
  assert.equal(expiryLevel(-1), "red");
  assert.equal(expiryLevel(3), "red");
  assert.equal(expiryLevel(4), "yellow");
  assert.equal(expiryLevel(7), "yellow");
  assert.equal(expiryLevel(8), "green");
});
test("earliest expiry first, undated last", () => {
  const l = [{ expiryDate: null }, { expiryDate: "2026-10-20" }, { expiryDate: "2026-10-18" }].sort(byExpiry);
  assert.deepEqual(l.map((x) => x.expiryDate), ["2026-10-18", "2026-10-20", null]);
});
test("categories map to storage locations", () => {
  assert.equal(locationOf("dairy"), "fridge");
  assert.equal(locationOf("frozen"), "freezer");
  assert.equal(locationOf("cleaning"), "cleaning");
  assert.equal(locationOf("canned"), "pantry");
  assert.equal(locationOf("custom-x"), "other");
});
