import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UnitPrice, UsageEvent } from "@/lib/smart-purchases";

export function useSmartPurchaseHistory(familyId: string | null) {
  const client = useQueryClient();
  const queryKey = ["smart-purchase-history", familyId];
  const query = useQuery({
    queryKey,
    enabled: !!familyId,
    retry: false,
    queryFn: async () => {
      if (!familyId) return { prices: [] as UnitPrice[], usage: [] as UsageEvent[] };
      const [prices, usage] = await Promise.all([
        supabase.from("receipt_unit_prices").select("store_id,store_name,name,unit,unit_price,currency,purchase_date").eq("family_id", familyId).order("purchase_date", { ascending: false }).limit(5000),
        supabase.from("inventory_usage_events").select("name,unit,category,quantity,remaining,expiry_date,created_at").eq("family_id", familyId).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (prices.error || usage.error) throw new Error("לא ניתן לטעון את היסטוריית הקניות");
      return { prices: prices.data as UnitPrice[], usage: usage.data as UsageEvent[] };
    },
  });
  useEffect(() => {
    if (!familyId) return;
    const refresh = () => { void client.invalidateQueries({ queryKey: ["smart-purchase-history", familyId] }); };
    const ch = supabase.channel(`smart-purchases-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "receipt_unit_prices", filter: `family_id=eq.${familyId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_usage_events", filter: `family_id=eq.${familyId}` }, refresh)
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    return () => { void supabase.removeChannel(ch); };
  }, [familyId, client]);
  return { prices: query.data?.prices ?? [], usage: query.data?.usage ?? [], error: query.isError, loading: query.isPending };
}