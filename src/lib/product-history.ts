// היסטוריית מוצרים מקומית — נשמרת כשפריט מסומן „נקנה” ומזינה השלמה אוטומטית
export type HistoryEntry = { name: string; category: string; count: number; lastUsed: number };

const KEY = "shopping-product-history";

export function loadHistory(): HistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.name === "string") : [];
  } catch {
    return [];
  }
}

export function recordPurchase(name: string, category: string): HistoryEntry[] {
  const clean = name.trim();
  if (!clean) return loadHistory();
  const list = loadHistory();
  const existing = list.find((e) => e.name === clean);
  if (existing) {
    existing.count += 1;
    existing.lastUsed = Date.now();
    if (category) existing.category = category;
  } else list.push({ name: clean, category, count: 1, lastUsed: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-300)));
  } catch {
    /* ignore */
  }
  return list;
}

// התאמות לפי טקסט, מדורגות לפי תדירות ועדכניות
export function matchHistory(names: string[], entries: HistoryEntry[], query: string, limit = 6): string[] {
  const q = query.trim();
  if (!q) return [];
  const score = new Map<string, number>();
  for (const e of entries) score.set(e.name, e.count * 10 + e.lastUsed / 1e12);
  const all = [...new Set([...entries.map((e) => e.name), ...names])];
  return all
    .filter((n) => n !== q && n.includes(q))
    .sort((a, b) => (Number(b.startsWith(q)) - Number(a.startsWith(q))) || (score.get(b) ?? 0) - (score.get(a) ?? 0))
    .slice(0, limit);
}
