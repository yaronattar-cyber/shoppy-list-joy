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