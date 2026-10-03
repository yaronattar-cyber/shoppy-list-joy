import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveName } from "@/lib/categories";
import { formatQuantity, parseQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";
import { fetchFamilyHistory, loadHistory, mergeHistory, recordFamilyPurchase, recordPurchase, type HistoryEntry } from "@/lib/product-history";

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

type Patch = Partial<Omit<Row, "id" | "family_id" | "created_at" | "added_by">>;

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

// המרת שדות DB לשדות פריט מקומי
const patchToItem = (p: Patch): Partial<ShoppingItem> => {
  const out: Partial<ShoppingItem> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.completed !== undefined) out.completed = p.completed;
  if (p.out_of_stock !== undefined) out.outOfStock = p.out_of_stock;
  if (p.quantity !== undefined) out.quantity = p.quantity;
  if (p.unit !== undefined) out.unit = p.unit;
  if (p.notes !== undefined) out.notes = p.notes;
  if (p.category !== undefined) out.category = p.category;
  if (p.archived !== undefined) out.archived = p.archived;
  return out;
};

// ===== Offline-first: תור פעולות + מטמון מקומי =====
type Op =
  | { type: "insert"; rows: Row[] }
  | { type: "update"; ids: string[]; patch: Patch }
  | { type: "delete"; ids: string[] };

const cacheKey = (f: string) => `shopping-cache-${f}`;
const queueKey = (f: string) => `shopping-queue-${f}`;
const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* אחסון מלא/חסום */
  }
};

// החלת פעולות ממתינות על רשימה (לשמירת שינויים מקומיים מעל נתוני הענן)
function applyOps(items: ShoppingItem[], ops: Op[]): ShoppingItem[] {
  let r = items;
  for (const op of ops) {
    if (op.type === "insert") {
      const fresh = op.rows.filter((row) => !r.some((i) => i.id === row.id)).map(toItem);
      r = [...fresh, ...r];
    } else if (op.type === "update") {
      const p = patchToItem(op.patch);
      r = r.map((i) => (op.ids.includes(i.id) ? { ...i, ...p } : i));
    } else {
      r = r.filter((i) => !op.ids.includes(i.id));
    }
  }
  return r;
}

// שגיאת רשת (אין קליטה) — נשאיר בתור. שגיאה אחרת — נשליך כדי לא להיתקע
const isNetworkError = (msg: string) =>
  (typeof navigator !== "undefined" && !navigator.onLine) || /fetch|network|timeout|load failed/i.test(msg);

async function sendOp(op: Op) {
  if (op.type === "insert") return supabase.from("items").upsert(op.rows, { onConflict: "id", ignoreDuplicates: true });
  if (op.type === "update") return supabase.from("items").update(op.patch).in("id", op.ids);
  return supabase.from("items").delete().in("id", op.ids);
}

// רשימת הקניות של המשפחה — ענן + מטמון מקומי, עובדת גם ללא קליטה
export function useShoppingList(familyId: string | null, userName?: string) {
  const [rows, setRows] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productHistory, setProductHistory] = useState<HistoryEntry[]>([]);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushingRef = useRef(false);

  // היסטוריה: מקומית מיד, ואז מיזוג עם היסטוריית המשפחה בענן + Realtime
  useEffect(() => {
    setProductHistory(loadHistory());
    if (!familyId) return;
    let active = true;
    const pull = () =>
      fetchFamilyHistory(familyId)
        .then((cloud) => active && setProductHistory(mergeHistory(loadHistory(), cloud)))
        .catch(() => {});
    void pull();
    const ch = supabase
      .channel(`history-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_product_history", filter: `family_id=eq.${familyId}` }, () => void pull())
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [familyId]);

  // טעינה מיידית מהמטמון
  useEffect(() => {
    if (!familyId) return;
    const cached = readJson<ShoppingItem[]>(cacheKey(familyId), []);
    const queue = readJson<Op[]>(queueKey(familyId), []);
    setRows(applyOps(cached, queue));
    setPendingCount(queue.length);
    if (cached.length) setLoading(false);
  }, [familyId]);

  // שמירת מצב נוכחי למטמון
  useEffect(() => {
    if (familyId && !loading) writeJson(cacheKey(familyId), rows);
  }, [familyId, rows, loading]);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("load items", error);
      setLoading(false);
      return;
    }
    const queue = readJson<Op[]>(queueKey(familyId), []);
    setRows(applyOps(((data ?? []) as Row[]).map(toItem), queue));
    setLoading(false);
  }, [familyId]);

  // שליחת התור לענן לפי הסדר
  const flush = useCallback(async () => {
    if (!familyId || flushingRef.current) return;
    flushingRef.current = true;
    setSyncing(true);
    try {
      let queue = readJson<Op[]>(queueKey(familyId), []);
      while (queue.length) {
        const op = queue[0]!;
        const { error } = await sendOp(op);
        if (error && isNetworkError(error.message)) break;
        if (error) console.error("sync op dropped", error);
        queue = readJson<Op[]>(queueKey(familyId), []).slice(1);
        writeJson(queueKey(familyId), queue);
        setPendingCount(queue.length);
      }
      if (!queue.length) await refresh();
    } catch (e) {
      console.warn("sync failed, will retry", e);
    } finally {
      flushingRef.current = false;
      setSyncing(false);
    }
  }, [familyId, refresh]);

  // הוספת פעולה: עדכון מקומי מיידי + תור + ניסיון שליחה
  const enqueue = useCallback(
    (op: Op) => {
      if (!familyId) return;
      setRows((r) => applyOps(r, [op]));
      const queue = [...readJson<Op[]>(queueKey(familyId), []), op];
      writeJson(queueKey(familyId), queue);
      setPendingCount(queue.length);
      void flush();
    },
    [familyId, flush],
  );

  // מנוי Realtime + האזנה לחזרת קליטה
  useEffect(() => {
    if (!familyId) return;
    setOnline(navigator.onLine);
    void flush().then(() => refresh());

    const channel = supabase
      .channel(`items-${familyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items", filter: `family_id=eq.${familyId}` },
        (payload) => {
          const queue = readJson<Op[]>(queueKey(familyId), []);
          setRows((r) => {
            let next: ShoppingItem[];
            if (payload.eventType === "DELETE") {
              const oldId = (payload.old as Partial<Row>).id;
              next = r.filter((i) => i.id !== oldId);
            } else {
              const item = toItem(payload.new as Row);
              next = r.some((i) => i.id === item.id) ? r.map((i) => (i.id === item.id ? item : i)) : [item, ...r];
            }
            // שינויים מקומיים שטרם נשלחו גוברים
            return queue.length ? applyOps(next, queue.filter((o) => o.type !== "insert")) : next;
          });
        },
      )
      .subscribe();

    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush().then(() => refresh());
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", onVisible);
    // ניסיון חוזר תקופתי — navigator.onLine לא תמיד אמין בקליטה חלשה
    const timer = setInterval(() => {
      if (readJson<Op[]>(queueKey(familyId), []).length) void flush();
    }, 15000);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [familyId, refresh, flush]);

  const items = useMemo(() => rows.filter((i) => !i.archived), [rows]);
  const inventory = useMemo(() => rows.filter((i) => i.archived), [rows]);

  const history = useMemo(() => [...new Set(rows.map((i) => i.name))], [rows]);

  const makeRow = useCallback(
    (name: string, quantity: number, unit: string): Row => ({
      id: crypto.randomUUID(),
      family_id: familyId!,
      name,
      quantity,
      unit,
      completed: false,
      out_of_stock: false,
      notes: "",
      category: "",
      archived: false,
      added_by: userName?.trim() || "אנונימי",
      created_at: new Date().toISOString(),
    }),
    [familyId, userName],
  );

  const addItem = useCallback(
    (rawName: string) => {
      const parsed = parseQuantity(rawName);
      const name = resolveName(parsed.name);
      if (!name || !familyId) return null;
      enqueue({ type: "insert", rows: [makeRow(name, parsed.quantity, parsed.unit)] });
      const q = formatQuantity(parsed.quantity, parsed.unit);
      return q ? `${q} ${name}` : name;
    },
    [familyId, enqueue, makeRow],
  );

  const addMany = useCallback(
    async (names: string[]) => {
      if (!familyId) return 0;
      const newRows = names
        .map((n) => parseQuantity(n))
        .map((p) => ({ ...p, name: resolveName(p.name) }))
        .filter((p) => p.name)
        .map((p) => makeRow(p.name, p.quantity, p.unit));
      if (!newRows.length) return 0;
      enqueue({ type: "insert", rows: newRows });
      return newRows.length;
    },
    [familyId, enqueue, makeRow],
  );

  // הוספת אוכל מוכן ישירות למלאי, בלי לעבור דרך רשימת הקניות
  const addPreparedMeal = (rawName: string) => {
    const parsed = parseQuantity(rawName);
    const name = parsed.name.trim();
    if (!name || !familyId) return false;
    const row = makeRow(name, parsed.quantity, parsed.unit);
    enqueue({
      type: "insert",
      rows: [{ ...row, completed: true, archived: true, category: "prepared-meal" }],
    });
    return true;
  };

  const update = useCallback((id: string, patch: Patch) => enqueue({ type: "update", ids: [id], patch }), [enqueue]);

  // הקשה: רגיל → נקנה; ממצב נקנה/חסר → חזרה לרגיל
  const toggleItem = useCallback(
    (id: string) => {
      const item = rows.find((i) => i.id === id);
      if (!item) return;
      const next = !(item.completed || item.outOfStock);
      if (next) {
        setProductHistory((h) => mergeHistory(h, recordPurchase(item.name, item.category)));
        if (familyId) void recordFamilyPurchase(familyId, item.name, item.category);
      }
      update(id, { completed: next, out_of_stock: false });
    },
    [rows, update, familyId],
  );

  // לחיצה ארוכה — „חסר במלאי” (או ביטולו)
  const markOutOfStock = useCallback(
    (id: string) => {
      const item = rows.find((i) => i.id === id);
      if (!item) return;
      update(id, { completed: false, out_of_stock: !item.outOfStock });
    },
    [rows, update],
  );

  const renameItem = useCallback(
    (id: string, name: string) => {
      const clean = name.trim();
      if (clean) update(id, { name: clean });
    },
    [update],
  );

  const setQuantity = useCallback(
    (id: string, quantity: number, unit?: string) => {
      if (!(quantity > 0)) return;
      update(id, unit === undefined ? { quantity } : { quantity, unit });
    },
    [update],
  );

  const updateDetails = useCallback(
    (id: string, details: Pick<Row, "name" | "quantity" | "unit" | "notes" | "category">) => {
      if (!details.name.trim() || !(details.quantity > 0)) return;
      update(id, { ...details, name: details.name.trim() });
    },
    [update],
  );

  const removeItem = useCallback(async (id: string) => enqueue({ type: "delete", ids: [id] }), [enqueue]);

  // „סמן הכל” — לפי מזהים כדי לעבוד גם ללא קליטה
  const markAll = useCallback(
    async (completed: boolean) => {
      const ids = rows.filter((i) => !i.archived).map((i) => i.id);
      if (ids.length) enqueue({ type: "update", ids, patch: { completed, out_of_stock: false } });
    },
    [rows, enqueue],
  );

  // העברת פריטים שנקנו למלאי
  const archiveCompleted = useCallback(async () => {
    const ids = rows.filter((i) => i.completed && !i.archived).map((i) => i.id);
    if (ids.length) enqueue({ type: "update", ids, patch: { archived: true } });
  }, [rows, enqueue]);

  const restoreFromInventory = useCallback(
    async (ids: string[]) => {
      if (ids.length) enqueue({ type: "update", ids, patch: { archived: false, completed: false, out_of_stock: false } });
    },
    [enqueue],
  );
  const deleteFromInventory = useCallback(
    async (ids: string[]) => {
      if (ids.length) enqueue({ type: "delete", ids });
    },
    [enqueue],
  );

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
    addPreparedMeal,
    toggleItem,
    renameItem,
    setQuantity,
    updateDetails,
    removeItem,
    markAll,
    archiveCompleted,
    refresh,
    online,
    pendingCount,
    syncing,
  };
}
