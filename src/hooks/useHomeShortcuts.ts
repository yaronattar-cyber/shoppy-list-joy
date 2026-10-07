import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Home preferences are independent of the List tab order and scoped to the signed-in user.
export function useHomeShortcuts() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const userId = useRef<string | null>(null);
  const current = useRef<string[]>([]);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    const load = async (id: string | null) => {
      if (id === userId.current) return;
      userId.current = id;
      current.current = [];
      setIds([]);
      setReady(false);
      if (!id) return;
      try {
        const cached = JSON.parse(localStorage.getItem(`home-shortcuts-${id}`) ?? "[]");
        if (Array.isArray(cached) && cached.every((v) => typeof v === "string")) { current.current = cached; setIds(cached); }
      } catch { /* cache is optional */ }
      const { data, error } = await supabase.from("user_tab_order").select("home_tab_ids").eq("user_id", id).maybeSingle();
      if (!alive || userId.current !== id) return;
      if (!error) {
        current.current = data?.home_tab_ids ?? [];
        setIds(current.current);
        localStorage.setItem(`home-shortcuts-${id}`, JSON.stringify(current.current));
      }
      setReady(true);
    };
    void supabase.auth.getUser().then(({ data }) => { if (alive) void load(data.user?.id ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) void load(session?.user.id ?? null); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  const save = useCallback((next: string[]) => {
    const id = userId.current;
    if (!id) return;
    current.current = next;
    setIds(next);
    localStorage.setItem(`home-shortcuts-${id}`, JSON.stringify(next));
    writes.current = writes.current.then(async () => {
      if (userId.current !== id) return;
      const { error } = await supabase.rpc("save_home_shortcuts", { _ids: next });
      if (error) toast.error("שמירת הקיצורים נכשלה, נסו שוב");
    });
  }, []);
  const pin = useCallback((id: string, pinned: boolean) => {
    save(pinned ? [...new Set([...current.current, id])] : current.current.filter((v) => v !== id));
  }, [save]);
  return { ids, ready, save, pin };
}