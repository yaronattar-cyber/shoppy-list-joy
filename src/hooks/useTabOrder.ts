import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// סדר לשוניות חנויות/אירועים אישי לכל משתמש (לפי user_id)
export function useTabOrder() {
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("user_tab_order").select("tab_ids").eq("user_id", u.user.id).maybeSingle();
      if (data?.tab_ids) setOrder(data.tab_ids);
    })();
  }, []);
  const save = useCallback(async (ids: string[]) => {
    setOrder(ids);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("user_tab_order").upsert({ user_id: u.user.id, tab_ids: ids, updated_at: new Date().toISOString() });
  }, []);
  const sort = useCallback(<T extends { id: string }>(list: T[]) => {
    const rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? 1e6 : i; };
    return [...list].sort((a, b) => rank(a.id) - rank(b.id));
  }, [order]);
  return { sort, save };
}
