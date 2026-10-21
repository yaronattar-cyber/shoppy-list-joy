export type StockRow = { id: string; name: string; quantity: number; unit: string };
export type RecipeIngredient = { item_name: string; amount: number | null; unit: string };
export const normalizeStockName = (value: string) => value.trim().toLowerCase();
export const scaledAmount = (ingredient: RecipeIngredient, ratio: number) => ingredient.amount == null ? null : Math.round(ingredient.amount * ratio * 100) / 100;
export function missingIngredientIndexes(ingredients: RecipeIngredient[], stock: StockRow[], ratio: number) {
  const available = stock.map((row) => ({ ...row }));
  const missing = new Set<number>();
  ingredients.forEach((ingredient, index) => {
    const need = scaledAmount(ingredient, ratio) ?? 1;
    const matches = available.filter((row) => normalizeStockName(row.name) === normalizeStockName(ingredient.item_name) && normalizeStockName(row.unit) === normalizeStockName(ingredient.unit));
    if (!matches.length || matches.reduce((sum, row) => sum + Number(row.quantity), 0) < need) missing.add(index);
    let remaining = need;
    matches.forEach((row) => { const used = Math.min(row.quantity, remaining); row.quantity -= used; remaining -= used; });
  });
  return missing;
}

// Consume shared stock sequentially, then combine repeated ingredient deficits.
export function missingRecipeIngredients(ingredients: RecipeIngredient[], stock: StockRow[], ratio: number): RecipeIngredient[] {
  const available = new Map<string, number>();
  const key = (name: string, unit: string) => `${normalizeStockName(name)}\u0000${normalizeStockName(unit)}`;
  for (const row of stock) available.set(key(row.name, row.unit), (available.get(key(row.name, row.unit)) ?? 0) + Math.max(0, row.quantity));
  const missing = new Map<string, RecipeIngredient>();
  for (const ingredient of ingredients) {
    const k = key(ingredient.item_name, ingredient.unit);
    const need = Math.max(0, scaledAmount(ingredient, ratio) ?? 1);
    const have = available.get(k) ?? 0;
    available.set(k, Math.max(0, have - need));
    const deficit = Math.round(Math.max(0, need - have) * 100) / 100;
    if (deficit > 0) missing.set(k, { ...ingredient, amount: Math.round(((missing.get(k)?.amount ?? 0) + deficit) * 100) / 100 });
  }
  return [...missing.values()];
}