ALTER TABLE public.families ADD COLUMN kind text NOT NULL DEFAULT 'family';
ALTER TABLE public.families ADD COLUMN owner_family_id text;
GRANT DELETE ON public.families TO anon, authenticated;
CREATE POLICY "event lists can be closed by code holders" ON public.families FOR DELETE TO anon, authenticated USING (kind = 'event');

CREATE TABLE public.event_members (
  event_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, family_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_members TO anon, authenticated;
GRANT ALL ON public.event_members TO service_role;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event members by code (select)" ON public.event_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event members by code (insert)" ON public.event_members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "event members by code (delete)" ON public.event_members FOR DELETE TO anon, authenticated USING (true);
ALTER TABLE public.event_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_members;