// כלי עזר לחוויית קנייה: Wake Lock, רטט, שיתוף וואטסאפ וקיבוץ לפי מחלקות
import { formatQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";

type Sentinel = { release: () => Promise<void> };
let sentinel: Sentinel | null = null;

export const wakeLockSupported = () => typeof navigator !== "undefined" && "wakeLock" in navigator;

export async function setWakeLock(on: boolean): Promise<boolean> {
  try {
    if (!on) { await sentinel?.release(); sentinel = null; return false; }
    const wl = (navigator as unknown as { wakeLock: { request: (t: "screen") => Promise<Sentinel> } }).wakeLock;
    sentinel = await wl.request("screen");
    return true;
  } catch { return false; }
}

export const haptic = (pattern: number | number[] = 15) => { try { navigator.vibrate?.(pattern); } catch { /* לא נתמך */ } };

export function openWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

export function listAsText(items: ShoppingItem[], storeName?: string) {
  const todo = items.filter((i) => !i.completed);
  const lines = todo.map((i, n) => `${n + 1}. ${i.name}${formatQuantity(i.quantity, i.unit) ? ` (${formatQuantity(i.quantity, i.unit)})` : ""}`);
  return `🛒 רשימת קניות${storeName ? ` – ${storeName}` : ""}\n${lines.join("\n")}`;
}

export const atStoreText = (storeName?: string) =>
  `היי כולם, אני עכשיו ב${storeName ? `־${storeName}` : "סופר"}. למישהו חסר עוד משהו? הוסיפו כאן: ${window.location.origin}`;

export function groupByCategory(items: ShoppingItem[]) {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || "כללי";
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].sort(([a], [b]) => (a === "כללי" ? 1 : b === "כללי" ? -1 : a.localeCompare(b, "he")));
}
