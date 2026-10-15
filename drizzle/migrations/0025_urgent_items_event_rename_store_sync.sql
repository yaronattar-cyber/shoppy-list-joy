ALTER TABLE public.items ADD COLUMN is_urgent boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.rename_event(_event_id text, _name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR length(trim(_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid event name'; END IF;
  UPDATE public.families SET name = trim(_name)
  WHERE id = _event_id AND kind = 'event' AND public.is_family_member(owner_family_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'forbidden'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.rename_event(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_event(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_store_purchase()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE source public.items;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_OP = 'DELETE' THEN
    source := OLD;
    IF OLD.archived THEN RETURN NULL; END IF;
  ELSE
    source := NEW;
    IF NOT ((NEW.completed AND NOT OLD.completed) OR (NEW.archived AND NOT OLD.archived)) THEN RETURN NULL; END IF;
  END IF;
  IF source.store_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.families WHERE id = source.family_id AND kind = 'family') THEN RETURN NULL; END IF;
  DELETE FROM public.items i
  WHERE i.family_id = source.family_id AND i.id <> source.id AND NOT i.archived
    AND i.store_id IS NOT NULL AND i.store_id <> source.store_id
    AND lower(trim(i.name)) = lower(trim(source.name));
  RETURN NULL;
END;
$$;
CREATE TRIGGER sync_store_purchase AFTER UPDATE OF completed, archived OR DELETE ON public.items FOR EACH ROW EXECUTE FUNCTION public.sync_store_purchase();