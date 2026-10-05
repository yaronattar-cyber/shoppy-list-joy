CREATE TABLE public.online_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  received_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.online_orders TO authenticated;
GRANT ALL ON public.online_orders TO service_role;
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members select online orders" ON public.online_orders FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY "members insert online orders" ON public.online_orders FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members update online orders" ON public.online_orders FOR UPDATE TO authenticated USING (public.is_family_member(family_id)) WITH CHECK (public.is_family_member(family_id));

CREATE TABLE public.online_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT ON public.online_order_items TO authenticated;
GRANT ALL ON public.online_order_items TO service_role;
ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members select online order items" ON public.online_order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.online_orders o WHERE o.id = order_id AND public.is_family_member(o.family_id))
);
CREATE POLICY "members insert online order items" ON public.online_order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.online_orders o WHERE o.id = order_id AND public.is_family_member(o.family_id))
);

CREATE INDEX online_orders_store_ordered_idx ON public.online_orders(store_id, ordered_at DESC);
CREATE INDEX online_order_items_order_idx ON public.online_order_items(order_id);

CREATE OR REPLACE FUNCTION public.create_online_order(_store_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _family_id text;
  _order_id uuid;
BEGIN
  SELECT family_id INTO _family_id FROM public.stores
  WHERE id = _store_id AND is_online_only = true AND public.is_family_member(family_id);
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Online store not found or access denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.items WHERE family_id = _family_id AND store_id = _store_id AND completed = true AND archived = false) THEN
    RAISE EXCEPTION 'No ordered items selected';
  END IF;
  INSERT INTO public.online_orders (family_id, store_id) VALUES (_family_id, _store_id) RETURNING id INTO _order_id;
  INSERT INTO public.online_order_items (order_id, name, quantity, unit, notes, category)
  SELECT _order_id, name, quantity, unit, notes, category FROM public.items
  WHERE family_id = _family_id AND store_id = _store_id AND completed = true AND archived = false;
  DELETE FROM public.items
  WHERE family_id = _family_id AND store_id = _store_id AND completed = true AND archived = false;
  RETURN _order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_online_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_online_order(_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _order public.online_orders%ROWTYPE;
  _count integer;
BEGIN
  SELECT * INTO _order FROM public.online_orders
  WHERE id = _order_id AND status = 'pending' AND public.is_family_member(family_id)
  FOR UPDATE;
  IF _order.id IS NULL THEN
    RAISE EXCEPTION 'Pending order not found or access denied';
  END IF;
  INSERT INTO public.items (family_id, name, completed, archived, added_by, quantity, unit, notes, category, out_of_stock, store_id, stock_status)
  SELECT _order.family_id, oi.name, true, true, 'הזמנה אונליין', oi.quantity, oi.unit, oi.notes, oi.category, false, _order.store_id, 'full'
  FROM public.online_order_items oi WHERE oi.order_id = _order_id;
  GET DIAGNOSTICS _count = ROW_COUNT;
  UPDATE public.online_orders SET status = 'received', received_at = now() WHERE id = _order_id;
  RETURN _count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.receive_online_order(uuid) TO authenticated;