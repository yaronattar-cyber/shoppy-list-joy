ALTER TABLE public.items ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;