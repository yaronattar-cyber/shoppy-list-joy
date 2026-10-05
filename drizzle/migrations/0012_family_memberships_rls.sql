CREATE TABLE public.family_memberships (
  user_id uuid NOT NULL,
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, family_id)
);
GRANT SELECT ON public.family_memberships TO authenticated;
GRANT ALL ON public.family_memberships TO service_role;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memberships" ON public.family_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_family_member(_fid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_memberships m
    WHERE m.user_id = auth.uid()
      AND (m.family_id = _fid OR EXISTS (
        SELECT 1 FROM public.event_members em WHERE em.event_id = _fid AND em.family_id = m.family_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.join_family(_id text, _name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _id IS NULL OR length(_id) < 4 OR length(_id) > 40 THEN RAISE EXCEPTION 'bad id'; END IF;
  INSERT INTO public.families (id, name) VALUES (_id, coalesce(nullif(_name, ''), 'המשפחה שלי')) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.family_memberships (user_id, family_id) VALUES (auth.uid(), _id) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.join_event(_event_id text, _family_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text;
BEGIN
  IF NOT public.is_family_member(_family_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT name INTO n FROM public.families WHERE id = _event_id AND kind = 'event';
  IF n IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.event_members (event_id, family_id) VALUES (_event_id, _family_id) ON CONFLICT DO NOTHING;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.is_family_member(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_family(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_event(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.merge_family_items(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_family_purchase(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_family_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_event(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_family_items(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_family_purchase(text, text, text) TO authenticated;

-- families
DROP POLICY IF EXISTS "anyone can create a family" ON public.families;
DROP POLICY IF EXISTS "event lists can be closed by code holders" ON public.families;
DROP POLICY IF EXISTS "families are readable by anyone with the id" ON public.families;
CREATE POLICY "members read family" ON public.families FOR SELECT TO authenticated USING (public.is_family_member(id));
CREATE POLICY "members create events" ON public.families FOR INSERT TO authenticated WITH CHECK (kind = 'event' AND public.is_family_member(owner_family_id));
CREATE POLICY "owner closes event" ON public.families FOR DELETE TO authenticated USING (kind = 'event' AND public.is_family_member(owner_family_id));

-- items
DROP POLICY IF EXISTS "list is shared by family id (delete)" ON public.items;
DROP POLICY IF EXISTS "list is shared by family id (insert)" ON public.items;
DROP POLICY IF EXISTS "list is shared by family id (select)" ON public.items;
DROP POLICY IF EXISTS "list is shared by family id (update)" ON public.items;
CREATE POLICY "members select items" ON public.items FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY "members insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members update items" ON public.items FOR UPDATE TO authenticated USING (public.is_family_member(family_id)) WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members delete items" ON public.items FOR DELETE TO authenticated USING (public.is_family_member(family_id));

-- stores
DROP POLICY IF EXISTS "stores shared by family id (delete)" ON public.stores;
DROP POLICY IF EXISTS "stores shared by family id (insert)" ON public.stores;
DROP POLICY IF EXISTS "stores shared by family id (select)" ON public.stores;
DROP POLICY IF EXISTS "stores shared by family id (update)" ON public.stores;
CREATE POLICY "members select stores" ON public.stores FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY "members insert stores" ON public.stores FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members update stores" ON public.stores FOR UPDATE TO authenticated USING (public.is_family_member(family_id)) WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members delete stores" ON public.stores FOR DELETE TO authenticated USING (public.is_family_member(family_id));

-- family_members
DROP POLICY IF EXISTS "members shared by family id (delete)" ON public.family_members;
DROP POLICY IF EXISTS "members shared by family id (insert)" ON public.family_members;
DROP POLICY IF EXISTS "members shared by family id (select)" ON public.family_members;
DROP POLICY IF EXISTS "members shared by family id (update)" ON public.family_members;
CREATE POLICY "members select family_members" ON public.family_members FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY "members insert family_members" ON public.family_members FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id) AND length(name) >= 1 AND length(name) <= 60);
CREATE POLICY "members update family_members" ON public.family_members FOR UPDATE TO authenticated USING (public.is_family_member(family_id)) WITH CHECK (public.is_family_member(family_id) AND role = ANY (ARRAY['', 'אבא', 'אמא', 'בן', 'בת']));
CREATE POLICY "members delete family_members" ON public.family_members FOR DELETE TO authenticated USING (public.is_family_member(family_id));

-- family_product_history
DROP POLICY IF EXISTS "history shared by family id (insert)" ON public.family_product_history;
DROP POLICY IF EXISTS "history shared by family id (select)" ON public.family_product_history;
DROP POLICY IF EXISTS "history shared by family id (update)" ON public.family_product_history;
CREATE POLICY "members select history" ON public.family_product_history FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY "members insert history" ON public.family_product_history FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members update history" ON public.family_product_history FOR UPDATE TO authenticated USING (public.is_family_member(family_id)) WITH CHECK (public.is_family_member(family_id));

-- event_members
DROP POLICY IF EXISTS "event members by code (delete)" ON public.event_members;
DROP POLICY IF EXISTS "event members by code (insert)" ON public.event_members;
DROP POLICY IF EXISTS "event members by code (select)" ON public.event_members;
CREATE POLICY "members select event_members" ON public.event_members FOR SELECT TO authenticated USING (public.is_family_member(family_id) OR public.is_family_member(event_id));
CREATE POLICY "members insert event_members" ON public.event_members FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members delete event_members" ON public.event_members FOR DELETE TO authenticated USING (public.is_family_member(family_id));

REVOKE ALL ON public.families, public.items, public.stores, public.family_members, public.family_product_history, public.event_members FROM anon;