import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveName } from "@/lib/categories";
import { formatQuantity, parseQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";
import { loadHistory, recordPurchase, type HistoryEntry } from "@/lib/product-history";

type Row = {
  id: string;
  family_id: string;
  name: string;
  completed: boolean;
  out_of_stock: boolean;
  quantity: number;
  unit: string;
  notes: string;
  category: string;
  archived: boolean;
  added_by: string;
  created_at: string;
};

const toItem = (row: Row): ShoppingItem => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  completed: row.completed,
  outOfStock: !!row.out_of_stock,
  quantity: Number(row.quantity) || 1,
  unit: row.unit ?? "",
  notes: row.notes ?? "",
  category: row.category ?? "",
  archived: row.archived,
  addedBy: row.added_by,
  createdAt: row.created_at,
});

// תור מקומי של שינויי סטטוס שנכשלו (רשת חלשה) — נשלחים שוב רק אם הם טריים,
// כדי לא לדרוס שינויים מאוחרים יותר של בני משפחה אחרים
type Pending = { completed: boolean; outOfStock: boolean; at: number };
const PENDING_TTL_MS = 10 * 60 * 1000;
const pendingKey = (familyId: string) => `shopping-pending-${familyId}`;
const loadPending = (familyId: string | null): Record<string, Pending> => {
  if (!familyId) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(pendingKey(familyId)) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const savePending = (familyId: string | null, map: Record<string, Pending>) => {
  if (!familyId) return;
  try {
    localStorage.setItem(pendingKey(familyId), JSON.stringify(map));
  } catch {
    /* אין גישה — נמשיך עם הענן בלבד */
  }
};
const setPending = (familyId: string | null, id: string, value: Pending | null) => {
  const map = loadPending(familyId);
  if (value) map[id] = value;
  else delete map[id];
  savePending(familyId, map);
};

// עדכון סטטוס לענן; בכישלון נשמר בתור המקומי לשליחה חוזרת
async function sendStatus(familyId: string | null, id: string, completed: boolean, outOfStock: boolean) {
  const { error } = await supabase.from("items").update({ completed, out_of_stock: outOfStock }).eq("id", id);
  if (error) {
    console.error("update status", error);
    setPending(familyId, id, { completed, outOfStock, at: Date.now() });
  } else setPending(familyId, id, null);
}

// רשימת הקניות של המשפחה — שמורה ב-Cloud ומסונכרנת בזמן אמת בין המכשירים
export function useShoppingList(familyId: string | null, userName?: string) {
  const [rows, setRows] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productHistory, setProductHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => setProductHistory(loadHistory()), []);
  // שחזור סימוני „נקנו” מקומיים פעם אחת לכל קבוצה, כדי לא להתנגד למכשירים אחרים
  const reconciledRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("load items", error);
      return;
    }
    const loaded = ((data ?? []) as Row[]).map(toItem);
    setRows(loaded);
    setLoading(false);

    // שליחה חוזרת של שינויים שנכשלו — פעם אחת לכל קבוצה ורק אם לא פג תוקפם
    if (reconciledRef.current === familyId) return;
    reconciledRef.current = familyId;
    const pending = loadPending(familyId);
    savePending(familyId, {});
    const byId = new Map(loaded.map((i) => [i.id, i]));
    for (const [id, p] of Object.entries(pending)) {
      const cur = byId.get(id);
      if (!cur || Date.now() - p.at > PENDING_TTL_MS) continue;
      if (cur.completed === p.completed && cur.outOfStock === p.outOfStock) continue;
      void sendStatus(familyId, id, p.completed, p.outOfStock);
      setRows((r) => r.map((i) => (i.id === id ? { ...i, completed: p.completed, outOfStock: p.outOfStock } : i)));
    }
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    void refresh();

    const channel = supabase
      .channel(`items-${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items", filter: `family_id=eq.${familyId}` },
        (payload) => {
          // מיזוג האירוע ל-state המקומי במקום טעינה מלאה
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as Partial<Row>).id;
            setRows((r) => r.filter((i) => i.id !== oldId));
            return;
          }
          const next = toItem(payload.new as Row);
          setRows((r) => {
            const exists = r.some((i) => i.id === next.id);
            return exists ? r.map((i) => (i.id === next.id ? next : i)) : [next, ...r];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, refresh]);

  const items = useMemo(() => rows.filter((i) => !i.archived), [rows]);
  // מלאי — פריטים שנקנו ונוקו מהרשימה
  const inventory = useMemo(() => rows.filter((i) => i.archived), [rows]);

  // היסטוריית המשפחה — לשימוש בהשלמה אוטומטית
  const history = useMemo(() => {
    const seen = new Set<string>();
    for (const item of rows) seen.add(item.name);
    return [...seen];
  }, [rows]);

  const addItem = useCallback(
    (rawName: string) => {
      const parsed = parseQuantity(rawName);
      const name = resolveName(parsed.name);
      if (!name || !familyId) return null;
      void supabase
        .from("items")
        .insert({ family_id: familyId, name, quantity: parsed.quantity, unit: parsed.unit, added_by: userName?.trim() || "אנונימי" })
        .then(({ error }) => {
          if (error) console.error("add item", error);
          void refresh();
        });
      const q = formatQuantity(parsed.quantity, parsed.unit);
      return q ? `${q} ${name}` : name;
    },
    [familyId, userName, refresh],
  );

  const addMany = useCallback(
    async (names: string[]) => {
      if (!familyId) return 0;
      const payload = names
        .map((n) => parseQuantity(n))
        .map((p) => ({ ...p, name: resolveName(p.name) }))
        .filter((p) => p.name)
        .map((p) => ({
          family_id: familyId,
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
          added_by: userName?.trim() || "אנונימי",
        }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("items").insert(payload);
      if (error) console.error("add many", error);
      await refresh();
      return payload.length;
    },
    [familyId, userName, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Row, "name" | "completed" | "archived" | "quantity" | "unit" | "notes" | "category">>) => {
      const { error } = await supabase.from("items").update(patch).eq("id", id);
      if (error) console.error("update item", error);
      await refresh();
    },
    [refresh],
  );

  // הקשה: רגיל → נקנה; ממצב נקנה/חסר → חזרה לרגיל. נקנה נשמר להיסטוריה
  const toggleItem = useCallback(
    (id: string) => {
      const item = rows.find((i) => i.id === id);
      if (!item) return;
      const next = !(item.completed || item.outOfStock);
      setRows((r) => r.map((i) => (i.id === id ? { ...i, completed: next, outOfStock: false } : i)));
      if (next) setProductHistory(recordPurchase(item.name, item.category));
      void sendStatus(familyId, id, next, false);
    },
    [rows, familyId],
  );

  // הקשה כפולה / לחיצה ארוכה — סימון „חסר במלאי” (או ביטולו)
  const markOutOfStock = useCallback(
    (id: string) => {
      const item = rows.find((i) => i.id === id);
      if (!item) return;
      const next = !item.outOfStock;
      setRows((r) => r.map((i) => (i.id === id ? { ...i, outOfStock: next, completed: false } : i)));
      void sendStatus(familyId, id, false, next);
    },
    [rows, familyId],
  );

  const renameItem = useCallback(
    (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      void update(id, { name: clean });
    },
    [update],
  );

  // שינוי כמות/יחידה מהיר
  const setQuantity = useCallback(
    (id: string, quantity: number, unit?: string) => {
      if (!(quantity > 0)) return;
      setRows((r) => r.map((i) => (i.id === id ? { ...i, quantity, unit: unit ?? i.unit } : i)));
      void update(id, unit === undefined ? { quantity } : { quantity, unit });
    },
    [update],
  );

  const updateDetails = useCallback(
    (id: string, details: Pick<Row, "name" | "quantity" | "unit" | "notes" | "category">) => {
      if (!details.name.trim() || !(details.quantity > 0)) return;
      setRows((current) => current.map((item) => (item.id === id ? { ...item, ...details, name: details.name.trim() } : item)));
      void update(id, { ...details, name: details.name.trim() });
    },
    [update],
  );

  const removeItem = useCallback(
    async (id: string) => {
      setPending(familyId, id, null);
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) console.error("remove item", error);
      await refresh();
    },
    [familyId, refresh],
  );

  // „סמן הכל” — סימון או ביטול סימון של כל הפריטים הפעילים
  const markAll = useCallback(
    async (completed: boolean) => {
      if (!familyId) return;
      setRows((r) => r.map((i) => (i.archived ? i : { ...i, completed, outOfStock: false })));
      const { error } = await supabase
        .from("items")
        .update({ completed, out_of_stock: false })
        .eq("family_id", familyId)
        .eq("archived", false);
      if (error) console.error("mark all", error);
      await refresh();
    },
    [familyId, rows, refresh],
  );

  // העברת הפריטים שהושלמו לארכיון — נשארים בהיסטוריה להשלמה אוטומטית
  const archiveCompleted = useCallback(async () => {
    if (!familyId) return;
    const { error } = await supabase
      .from("items")
      .update({ archived: true })
      .eq("family_id", familyId)
      .eq("completed", true)
      .eq("archived", false);
    if (error) console.error("archive", error);
    await refresh();
  }, [familyId, refresh]);

  // מלאי: החזרה לרשימה (כן) או מחיקה לצמיתות (לא)
  const restoreFromInventory = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setRows((r) => r.map((i) => (ids.includes(i.id) ? { ...i, archived: false, completed: false, outOfStock: false } : i)));
    const { error } = await supabase.from("items").update({ archived: false, completed: false, out_of_stock: false }).in("id", ids);
    if (error) console.error("restore", error);
    await refresh();
  }, [refresh]);
  const deleteFromInventory = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setRows((r) => r.filter((i) => !ids.includes(i.id)));
    const { error } = await supabase.from("items").delete().in("id", ids);
    if (error) console.error("delete inventory", error);
    await refresh();
  }, [refresh]);

  return {
    items,
    inventory,
    restoreFromInventory,
    deleteFromInventory,
    history,
    productHistory,
    loading,
    markOutOfStock,
    addItem,
    addMany,
    toggleItem,
    renameItem,
    setQuantity,
    updateDetails,
    removeItem,
    markAll,
    archiveCompleted,
    refresh,
  };
}
