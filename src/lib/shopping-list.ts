// שכבת נתונים לרשימת הקניות — מבודדת כדי שיהיה קל להחליף אותה
// בעתיד ב-API (למשל השוואת מחירים) ללא שינוי ברכיבי התצוגה.

export type ShoppingItem = {
  id: string;
  name: string;
  done: boolean;
  createdAt: number;
  createdAtLabel?: string | undefined; // DD/MM/YYYY HH:mm
  addedBy?: string | undefined;
  // שדות עתידיים להשוואת מחירים: price?, store?, barcode?
};

const STORAGE_KEY = "smart-shopping-list.v1";

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function loadItems(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // תאימות לאחור: פריטים ישנים ללא metadata
    return (parsed as ShoppingItem[]).map((item) => ({
      ...item,
      createdAt: item.createdAt ?? Date.now(),
      createdAtLabel: item.createdAtLabel ?? undefined,
      addedBy: item.addedBy ?? undefined,
    }));
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

export function createItem(name: string, addedBy?: string): ShoppingItem {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    done: false,
    createdAt: now,
    createdAtLabel: formatDateTime(now),
    addedBy: addedBy?.trim() || undefined,
  };
}
