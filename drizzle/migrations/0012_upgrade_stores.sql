ALTER TABLE public.stores 
ADD COLUMN address text DEFAULT '',
ADD COLUMN opening_hours text DEFAULT '',
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric,
ADD COLUMN is_online boolean DEFAULT false;

-- Create an orders table to track shopping history per store
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  items_count integer NOT NULL DEFAULT 0,
  total_estimate numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders shared by family id (select)" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "orders shared by family id (insert)" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "orders shared by family id (delete)" ON public.orders FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
