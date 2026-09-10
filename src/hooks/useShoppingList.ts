import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveName } from "@/lib/categories";
import type { ShoppingItem } from "@/lib/shopping-list";

type Row = {
  id: string;
  family_id: string;
  name: string;
  completed: boolean;
  archived: boolean;
  added_by: string;
  created_at: string;
};

const toItem = (row: Row): ShoppingItem => ({
  id: row.id,
  familyId: row.family_id,
  name: row.name,
  completed: row.completed,
  archived: row.archived,
  addedBy: row.added_by,
  createdAt: row.created_at,
});

// רשימת הקניות של המשפחה — שמורה ב-Cloud ומסונכרנת בזמן אמת בין המכשירים
export function useShoppingList(familyId: string | null, userName?: string) {
  const [rows, setRows] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    setRows(((data ?? []) as Row[]).map(toItem));
    setLoading(false);
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
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, refresh]);

  const items = useMemo(() => rows.filter((i) => !i.archived), [rows]);

  // היסטוריית המשפחה — לשימוש בהשלמה אוטומטית
  const history = useMemo(() => {
    const seen = new Set<string>();
    for (const item of rows) seen.add(item.name);
    return [...seen];
  }, [rows]);

  const addItem = useCallback(
    (rawName: string) => {
      const name = resolveName(rawName);
      if (!name || !familyId) return null;
      void supabase
        .from("items")
        .insert({ family_id: familyId, name, added_by: userName?.trim() || "אנונימי" })
        .then(({ error }) => {
          if (error) console.error("add item", error);
          void refresh();
        });
      return name;
    },
    [familyId, userName, refresh],
  );

  const addMany = useCallback(
    async (names: string[]) => {
      if (!familyId) return 0;
      const payload = names
        .map((n) => resolveName(n))
        .filter(Boolean)
        .map((name) => ({
          family_id: familyId,
          name,
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
    async (id: string, patch: Partial<Pick<Row, "name" | "completed" | "archived">>) => {
      const { error } = await supabase.from("items").update(patch).eq("id", id);
      if (error) console.error("update item", error);
      await refresh();
    },
    [refresh],
  );

  const toggleItem = useCallback(
    (id: string) => {
      const item = rows.find((i) => i.id === id);
      if (!item) return;
      void update(id, { completed: !item.completed });
    },
    [rows, update],
  );

  const renameItem = useCallback(
    (id: string, name: string) => {
      const clean = name.trim();
      if (!clean) return;
      void update(id, { name: clean });
    },
    [update],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) console.error("remove item", error);
      await refresh();
    },
    [refresh],
  );

  // „סמן הכל” — סימון או ביטול סימון של כל הפריטים הפעילים
  const markAll = useCallback(
    async (completed: boolean) => {
      if (!familyId) return;
      const { error } = await supabase
        .from("items")
        .update({ completed })
        .eq("family_id", familyId)
        .eq("archived", false);
      if (error) console.error("mark all", error);
      await refresh();
    },
    [familyId, refresh],
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

  return {
    items,
    history,
    loading,
    addItem,
    addMany,
    toggleItem,
    renameItem,
    removeItem,
    markAll,
    archiveCompleted,
    refresh,
  };
}
