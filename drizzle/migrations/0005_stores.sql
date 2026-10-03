CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO anon, authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores shared by family id (select)" ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stores shared by family id (insert)" ON public.stores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "stores shared by family id (update)" ON public.stores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "stores shared by family id (delete)" ON public.stores FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX stores_family_idx ON public.stores(family_id);
ALTER TABLE public.items ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;