import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// חנות משפחתית: שם + כתובת אתר (לחישוב/שליפת מחירים בעתיד)
export type StoreInfo = { id: string; name: string; url: string };

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
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) return;
    setStores(read<StoreInfo[]>(cacheKey(familyId), []));
    setActiveId(read<string | null>(activeKey(familyId), null));
    let alive = true;
    const pull = async () => {
      const { data } = await supabase.from("stores").select("id,name,url").eq("family_id", familyId).order("created_at");
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

  const save = useCallback(
    async (store: { id?: string; name: string; url: string }) => {
      if (!familyId || !store.name.trim()) return;
      const payload = { name: store.name.trim(), url: normalizeUrl(store.url) };
      if (store.id) {
        setStores((s) => s.map((x) => (x.id === store.id ? { ...x, ...payload } : x)));
        await supabase.from("stores").update(payload).eq("id", store.id);
      } else {
        const id = crypto.randomUUID();
        setStores((s) => [...s, { id, ...payload }]);
        select(id);
        await supabase.from("stores").insert({ id, family_id: familyId, ...payload });
      }
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

  const active = stores.find((s) => s.id === activeId) ?? null;
  return { stores, active, activeId: active ? activeId : null, select, save, remove };
}
