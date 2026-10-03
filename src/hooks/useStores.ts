import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// חנות משפחתית: שם + כתובת אתר (לחישוב/שליפת מחירים בעתיד)
export type StoreInfo = { id: string; name: string; url: string; is_default?: boolean };

const cacheKey = (f: string) => `stores-cache-${f}`;
const activeKey = (f: string) => `stores-active-${f}`;
const read = <T,>(k: string, fb: T): T => {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : fb;
  } catch {
    return fb;
  }
};

// כתובת תקינה עם https כברירת מחדל
export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function useStores(familyId: string | null) {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  // undefined = לא נבחר ידנית בסשן → סופר הבית
  const [activeId, setActiveId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!familyId) return;
    setStores(read<StoreInfo[]>(cacheKey(familyId), []));
    setActiveId(undefined);
    let alive = true;
    const pull = async () => {
      const { data } = await supabase.from("stores").select("id,name,url,is_default").eq("family_id", familyId).order("created_at");
      if (!alive || !data) return;
      setStores(data);
      localStorage.setItem(cacheKey(familyId), JSON.stringify(data));
    };
    void pull();
    const ch = supabase
      .channel(`stores-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stores", filter: `family_id=eq.${familyId}` }, () => void pull())
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, [familyId]);

  // בחירת חנות נשמרת במכשיר
  const select = useCallback(
    (id: string | null) => {
      setActiveId(id);
      if (familyId) localStorage.setItem(activeKey(familyId), JSON.stringify(id));
    },
    [familyId],
  );
  // חזרה לסופר הבית (ברירת מחדל)
  const resetToDefault = useCallback(() => setActiveId(undefined), []);

  const save = useCallback(
    async (store: { id?: string; name: string; url: string; is_default?: boolean }) => {
      if (!familyId || !store.name.trim()) return;
      const payload = { name: store.name.trim(), url: normalizeUrl(store.url), is_default: !!store.is_default };
      const id = store.id ?? crypto.randomUUID();
      setStores((s) => {
        const next = store.id ? s.map((x) => (x.id === id ? { ...x, ...payload } : x)) : [...s, { id, ...payload }];
        const fixed = payload.is_default ? next.map((x) => ({ ...x, is_default: x.id === id })) : next;
        localStorage.setItem(cacheKey(familyId), JSON.stringify(fixed));
        return fixed;
      });
      if (!store.id) select(id);
      if (payload.is_default) await supabase.from("stores").update({ is_default: false }).eq("family_id", familyId).neq("id", id);
      if (store.id) await supabase.from("stores").update(payload).eq("id", id);
      else await supabase.from("stores").insert({ id, family_id: familyId, ...payload });
    },
    [familyId, select],
  );

  // מחיקת חנות — הפריטים שלה עוברים לרשימה הכללית
  const remove = useCallback(
    async (id: string) => {
      setStores((s) => s.filter((x) => x.id !== id));
      if (activeId === id) select(null);
      await supabase.from("stores").delete().eq("id", id);
    },
    [activeId, select],
  );

  const defaultStore = stores.find((s) => s.is_default) ?? null;
  const active = activeId === undefined ? defaultStore : (stores.find((s) => s.id === activeId) ?? null);
  return { stores, active, activeId: active?.id ?? null, defaultStore, select, resetToDefault, save, remove };
}
