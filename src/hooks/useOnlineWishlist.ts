// רשימת "קניות אונליין" מהחיפוש החזותי — נשמרת מקומית במכשיר
import { useCallback, useEffect, useState } from "react";

// ordered = נקנה אונליין וממתין למשלוח (מוצג במלאי עד אישור הגעה)
export type WishItem = { id: string; title: string; store: string; price: string; url: string; image: string; done: boolean; ordered?: boolean };
const KEY = "online-wishlist";

const load = (): WishItem[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};

export function useOnlineWishlist() {
  const [items, setItems] = useState<WishItem[]>([]);
  useEffect(() => {
    setItems(load());
    const on = (e: StorageEvent) => { if (e.key === KEY) setItems(load()); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  const update = useCallback((fn: (p: WishItem[]) => WishItem[]) => {
    setItems((p) => {
      const next = fn(p);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* מקום אחסון מלא */ }
      return next;
    });
  }, []);
  return {
    items: items.filter((x) => !x.ordered),
    ordered: items.filter((x) => x.ordered),
    add: (list: Omit<WishItem, "id" | "done">[]) => update((p) => [...p, ...list.map((x) => ({ ...x, id: crypto.randomUUID(), done: false }))]),
    toggle: (id: string) => update((p) => p.map((x) => (x.id === id ? { ...x, done: !x.done } : x))),
    rename: (id: string, title: string) => update((p) => p.map((x) => (x.id === id ? { ...x, title } : x))),
    remove: (id: string) => update((p) => p.filter((x) => x.id !== id)),
    removeStore: (store: string) => update((p) => p.filter((x) => x.store !== store)),
  };
}
