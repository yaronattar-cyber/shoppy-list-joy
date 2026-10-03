import { supabase } from "@/integrations/supabase/client";
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

// ---- סנכרון משפחתי בענן ----

// מיזוג היסטוריה מקומית ומשפחתית: לוקחים את המונה הגבוה והשימוש האחרון
export function mergeHistory(a: HistoryEntry[], b: HistoryEntry[]): HistoryEntry[] {
  const map = new Map<string, HistoryEntry>();
  for (const e of [...a, ...b]) {
    const prev = map.get(e.name);
    if (!prev) map.set(e.name, { ...e });
    else {
      prev.count = Math.max(prev.count, e.count);
      prev.lastUsed = Math.max(prev.lastUsed, e.lastUsed);
      if (e.category) prev.category = e.category;
    }
  }
  return [...map.values()];
}

export async function fetchFamilyHistory(familyId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from("family_product_history")
    .select("name, category, count, last_used")
    .eq("family_id", familyId)
    .order("last_used", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => ({ name: r.name, category: r.category, count: r.count, lastUsed: new Date(r.last_used).getTime() }));
}

export async function recordFamilyPurchase(familyId: string, name: string, category: string) {
  const { error } = await supabase.rpc("record_family_purchase", { _family_id: familyId, _name: name.trim(), _category: category ?? "" });
  if (error) console.warn("family history sync failed", error.message);
}

// מעביר את הפריטים וההיסטוריה מהמשפחה הקודמת לחדשה
export async function mergeFamilyItems(from: string, to: string): Promise<number> {
  const { data, error } = await supabase.rpc("merge_family_items", { _from: from, _to: to });
  if (error) throw error;
  return data ?? 0;
}
