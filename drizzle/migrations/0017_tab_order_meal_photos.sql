ALTER TABLE public.items ADD COLUMN IF NOT EXISTS photo_url text;
CREATE TABLE public.user_tab_order (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  tab_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_tab_order TO authenticated;
GRANT ALL ON public.user_tab_order TO service_role;
ALTER TABLE public.user_tab_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tab order select" ON public.user_tab_order FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own tab order insert" ON public.user_tab_order FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own tab order update" ON public.user_tab_order FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());