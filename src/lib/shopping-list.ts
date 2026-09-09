// שכבת נתונים לרשימת הקניות — מבודדת כדי שיהיה קל להחליף אותה
// בעתיד ב-API (למשל השוואת מחירים) ללא שינוי ברכיבי התצוגה.

export type ShoppingItem = {
  id: string;
  name: string;
  done: boolean;
  createdAt: number;
  // שדות עתידיים להשוואת מחירים: price?, store?, barcode?
};

const STORAGE_KEY = "smart-shopping-list.v1";

export const QUICK_PICKS = ["חלב", "לחם", "ביצים", "גבינה", "ירקות"] as const;

export function loadItems(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShoppingItem[]) : [];
  } catch {
    return [];
  }
}

export function saveItems(items: ShoppingItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // מקום אחסון מלא או חסום — מתעלמים בשקט
  }
}

export function createItem(name: string): ShoppingItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    done: false,
    createdAt: Date.now(),
  };
}
