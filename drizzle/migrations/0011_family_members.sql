CREATE TABLE public.family_members (
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO anon, authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members shared by family id (select)" ON public.family_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "members shared by family id (insert)" ON public.family_members FOR INSERT TO anon, authenticated WITH CHECK (length(name) BETWEEN 1 AND 60);
CREATE POLICY "members shared by family id (update)" ON public.family_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (role IN ('', 'אבא', 'אמא', 'בן', 'בת'));
CREATE POLICY "members shared by family id (delete)" ON public.family_members FOR DELETE TO anon, authenticated USING (true);
ALTER TABLE public.family_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;