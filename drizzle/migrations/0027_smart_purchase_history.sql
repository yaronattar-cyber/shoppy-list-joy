CREATE TABLE public.inventory_usage_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id text NOT NULL REFERENCES public.families(id), name text NOT NULL, unit text NOT NULL, category text NOT NULL DEFAULT '', quantity numeric NOT NULL, remaining numeric NOT NULL, expiry_date date, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_usage_events TO authenticated;
GRANT ALL ON public.inventory_usage_events TO service_role;
ALTER TABLE public.inventory_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read inventory usage" ON public.inventory_usage_events FOR SELECT TO authenticated USING(public.is_family_member(family_id));
CREATE POLICY "members record inventory usage" ON public.inventory_usage_events FOR INSERT TO authenticated WITH CHECK(public.is_family_member(family_id));
CREATE INDEX inventory_usage_family_time ON public.inventory_usage_events(family_id,created_at DESC);
CREATE FUNCTION public.record_inventory_usage() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF OLD.archived AND EXISTS(SELECT 1 FROM public.families WHERE id=OLD.family_id AND kind='family') THEN
  IF TG_OP='DELETE' THEN
   INSERT INTO public.inventory_usage_events(family_id,name,unit,category,quantity,remaining,expiry_date) VALUES(OLD.family_id,OLD.name,OLD.unit,OLD.category,OLD.quantity,0,OLD.expiry_date);
  ELSIF NEW.archived AND NEW.family_id=OLD.family_id AND NEW.quantity<OLD.quantity THEN
   INSERT INTO public.inventory_usage_events(family_id,name,unit,category,quantity,remaining,expiry_date) VALUES(OLD.family_id,OLD.name,OLD.unit,OLD.category,OLD.quantity-NEW.quantity,NEW.quantity,OLD.expiry_date);
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER record_inventory_usage AFTER UPDATE OR DELETE ON public.items FOR EACH ROW EXECUTE FUNCTION public.record_inventory_usage();
CREATE TABLE public.receipt_unit_prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id text NOT NULL REFERENCES public.families(id), expense_id uuid NOT NULL REFERENCES public.expenses(id), store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL, store_name text NOT NULL, name text NOT NULL, unit text NOT NULL, unit_price numeric NOT NULL CHECK(unit_price>=0), currency text NOT NULL, purchase_date date NOT NULL
);
GRANT SELECT, INSERT ON public.receipt_unit_prices TO authenticated;
GRANT ALL ON public.receipt_unit_prices TO service_role;
ALTER TABLE public.receipt_unit_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read receipt prices" ON public.receipt_unit_prices FOR SELECT TO authenticated USING(public.is_family_member(family_id));
CREATE POLICY "members record receipt prices" ON public.receipt_unit_prices FOR INSERT TO authenticated WITH CHECK(public.is_family_member(family_id));
CREATE INDEX receipt_prices_family_date ON public.receipt_unit_prices(family_id,purchase_date DESC);
CREATE FUNCTION public.snapshot_receipt_prices() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 INSERT INTO public.receipt_unit_prices(family_id,expense_id,store_id,store_name,name,unit,unit_price,currency,purchase_date)
 SELECT NEW.family_id,NEW.id,(SELECT min(s.id::text)::uuid FROM public.stores s WHERE s.family_id=NEW.family_id AND lower(trim(s.name))=lower(trim(NEW.store_name)) HAVING count(*)=1),NEW.store_name,i.name,i.unit,(l.value->>'unit_price')::numeric,NEW.currency,NEW.purchase_date
 FROM jsonb_array_elements(NEW.receipt_items) l JOIN public.items i ON i.id::text=l.value->>'item_id' AND i.family_id=NEW.family_id;
 RETURN NULL;
END $$;
CREATE TRIGGER snapshot_receipt_prices AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.snapshot_receipt_prices();
INSERT INTO public.receipt_unit_prices(family_id,expense_id,store_id,store_name,name,unit,unit_price,currency,purchase_date)
 SELECT e.family_id,e.id,(SELECT min(s.id::text)::uuid FROM public.stores s WHERE s.family_id=e.family_id AND lower(trim(s.name))=lower(trim(e.store_name)) HAVING count(*)=1),e.store_name,i.name,i.unit,(l.value->>'unit_price')::numeric,e.currency,e.purchase_date
 FROM public.expenses e CROSS JOIN LATERAL jsonb_array_elements(e.receipt_items) l JOIN public.items i ON i.id::text=l.value->>'item_id' AND i.family_id=e.family_id;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_usage_events, public.receipt_unit_prices;