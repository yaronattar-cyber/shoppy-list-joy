CREATE TABLE public.family_product_history (
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  count integer NOT NULL DEFAULT 1,
  last_used timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, name)
);
GRANT SELECT, INSERT, UPDATE ON public.family_product_history TO anon, authenticated;
GRANT ALL ON public.family_product_history TO service_role;
ALTER TABLE public.family_product_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history shared by family id (select)" ON public.family_product_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "history shared by family id (insert)" ON public.family_product_history FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "history shared by family id (update)" ON public.family_product_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- רישום קנייה אטומי: מגדיל מונה או יוצר רשומה
CREATE OR REPLACE FUNCTION public.record_family_purchase(_family_id text, _name text, _category text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  INSERT INTO public.family_product_history (family_id, name, category)
  VALUES (_family_id, _name, coalesce(_category, ''))
  ON CONFLICT (family_id, name) DO UPDATE
    SET count = family_product_history.count + 1,
        last_used = now(),
        category = CASE WHEN EXCLUDED.category <> '' THEN EXCLUDED.category ELSE family_product_history.category END;
$$;
GRANT EXECUTE ON FUNCTION public.record_family_purchase(text, text, text) TO anon, authenticated;

-- העברת פריטים מרשימה קודמת לרשימת המשפחה החדשה
CREATE OR REPLACE FUNCTION public.merge_family_items(_from text, _to text)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF _from = _to THEN RETURN 0; END IF;
  UPDATE public.items SET family_id = _to WHERE family_id = _from;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.family_product_history (family_id, name, category, count, last_used)
  SELECT _to, name, category, count, last_used FROM public.family_product_history WHERE family_id = _from
  ON CONFLICT (family_id, name) DO UPDATE
    SET count = family_product_history.count + EXCLUDED.count,
        last_used = greatest(family_product_history.last_used, EXCLUDED.last_used);
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.merge_family_items(text, text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.family_product_history;