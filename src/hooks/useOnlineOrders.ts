import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnlineOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  category: string;
};

export type OnlineOrder = {
  id: string;
  storeId: string;
  orderedAt: string;
  status: "pending" | "received";
  receivedAt: string | null;
  items: OnlineOrderItem[];
};

type OrderRow = {
  id: string;
  store_id: string;
  ordered_at: string;
  status: string;
  received_at: string | null;
  online_order_items: OnlineOrderItemRow[] | null;
};

type OnlineOrderItemRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
  category: string;
};

const cacheKey = (familyId: string, storeId: string) => `online-orders-${familyId}-${storeId}`;

function readCache(key: string): OnlineOrder[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as OnlineOrder[]) : [];
  } catch {
    return [];
  }
}

function mapOrder(row: OrderRow): OnlineOrder {
  return {
    id: row.id,
    storeId: row.store_id,
    orderedAt: row.ordered_at,
    status: row.status === "received" ? "received" : "pending",
    receivedAt: row.received_at,
    items: (row.online_order_items ?? []).map((item) => ({ ...item, quantity: Number(item.quantity) || 1 })),
  };
}

export function useOnlineOrders(familyId: string | null, storeId: string | null) {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    if (!familyId || !storeId) {
      setOrders([]);
      return;
    }
    // storeId "*" = כל ההזמנות הממתינות של המשפחה (למסך המלאי)
    let q = supabase
      .from("online_orders")
      .select("id,store_id,ordered_at,status,received_at,online_order_items(id,name,quantity,unit,notes,category)")
      .eq("family_id", familyId);
    q = storeId === "*" ? q.eq("status", "pending") : q.eq("store_id", storeId);
    const { data, error } = await q.order("ordered_at", { ascending: false });
    if (error) throw error;
    const next = ((data ?? []) as OrderRow[]).map(mapOrder);
    setOrders(next);
    localStorage.setItem(cacheKey(familyId, storeId), JSON.stringify(next));
  }, [familyId, storeId]);

  useEffect(() => {
    if (!familyId || !storeId) {
      setOrders([]);
      return;
    }
    setOrders(readCache(cacheKey(familyId, storeId)));
    void refresh().catch(() => {});
    const channel = supabase
      .channel(`online-orders-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_orders", filter: storeId === "*" ? `family_id=eq.${familyId}` : `store_id=eq.${storeId}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "online_order_items" }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [familyId, storeId, refresh]);

  const createOrder = useCallback(async () => {
    if (!storeId || working) return false;
    setWorking(true);
    try {
      const { error } = await supabase.rpc("create_online_order", { _store_id: storeId });
      if (error) throw error;
      await refresh();
      return true;
    } finally {
      setWorking(false);
    }
  }, [storeId, working, refresh]);

  const receiveOrder = useCallback(async (orderId: string) => {
    if (working) return 0;
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc("receive_online_order", { _order_id: orderId });
      if (error) throw error;
      await refresh();
      return data ?? 0;
    } finally {
      setWorking(false);
    }
  }, [working, refresh]);

  return { orders, working, createOrder, receiveOrder, refresh };
}