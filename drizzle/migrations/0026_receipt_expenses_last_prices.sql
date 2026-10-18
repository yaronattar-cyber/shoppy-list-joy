ALTER TABLE public.items ADD COLUMN IF NOT EXISTS last_price numeric CHECK (last_price >= 0);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS last_price_currency text;
CREATE TABLE public.expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id text NOT NULL REFERENCES public.families(id), store_name text NOT NULL, purchase_date date NOT NULL, total_amount numeric NOT NULL CHECK(total_amount >= 0), currency text NOT NULL DEFAULT 'ILS', receipt_url text NOT NULL, receipt_items jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(family_id, receipt_url)
);
GRANT SELECT, INSERT ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read expenses" ON public.expenses FOR SELECT TO authenticated USING(public.is_family_member(family_id));
CREATE POLICY "members insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK(public.is_family_member(family_id));
CREATE INDEX expenses_family_date ON public.expenses(family_id, purchase_date);
CREATE POLICY "family read receipts" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='receipts' AND public.is_family_member((storage.foldername(name))[1]));
CREATE POLICY "family upload receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='receipts' AND public.is_family_member((storage.foldername(name))[1]));
CREATE POLICY "family delete receipts" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='receipts' AND public.is_family_member((storage.foldername(name))[1]));
CREATE FUNCTION public.save_receipt(_id uuid, _family text, _store text, _date date, _total numeric, _currency text, _path text, _lines jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE line jsonb; found_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_family_member(_family) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.families WHERE id=_family AND kind='family') THEN RAISE EXCEPTION 'Household required'; END IF;
 IF split_part(_path,'/',1)<>_family OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='receipts' AND name=_path) THEN RAISE EXCEPTION 'Invalid receipt file'; END IF;
 IF length(trim(_store)) NOT BETWEEN 1 AND 200 OR _total<0 OR _currency !~ '^[A-Z]{3}$' OR jsonb_typeof(_lines)<>'array' OR jsonb_array_length(_lines)>200 THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
 SELECT id INTO found_id FROM public.expenses WHERE family_id=_family AND (id=_id OR receipt_url=_path);
 IF found_id IS NOT NULL THEN RETURN found_id; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(_lines) LOOP
  IF (line->>'unit_price')::numeric < 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
  IF line->>'item_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.items WHERE id=(line->>'item_id')::uuid AND family_id=_family) THEN RAISE EXCEPTION 'Invalid matched item' USING ERRCODE='42501'; END IF;
 END LOOP;
 INSERT INTO public.expenses(id,family_id,store_name,purchase_date,total_amount,currency,receipt_url,receipt_items) VALUES(_id,_family,trim(_store),_date,_total,_currency,_path,_lines);
 FOR line IN SELECT value FROM jsonb_array_elements(_lines) LOOP
  UPDATE public.items SET last_price=(line->>'unit_price')::numeric,last_price_currency=_currency WHERE id=(line->>'item_id')::uuid AND family_id=_family;
 END LOOP;
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.save_receipt(uuid,text,text,date,numeric,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_receipt(uuid,text,text,date,numeric,text,text,jsonb) TO authenticated;