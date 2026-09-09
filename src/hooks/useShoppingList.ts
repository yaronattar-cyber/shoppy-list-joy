import { useCallback, useEffect, useState } from "react";
import {
  createItem,
  loadItems,
  saveItems,
  type ShoppingItem,
} from "@/lib/shopping-list";

// לוגיקת הרשימה במקום אחד: קריאה/שמירה מקומית + פעולות על פריטים.
export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // טעינה אחרי הרכבה כדי למנוע אי-התאמה בין שרת לדפדפן
  useEffect(() => {
    setItems(loadItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveItems(items);
  }, [items, hydrated]);

  const addItem = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return false;
    setItems((prev) => [createItem(clean), ...prev]);
    return true;
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  }, []);

  const renameItem = useCallback((id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: clean } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  return { items, hydrated, addItem, toggleItem, renameItem, removeItem, clearAll };
}
