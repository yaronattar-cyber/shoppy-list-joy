-- קבוצות משפחה: מזהה קצר שמשותף בקישור הזמנה
CREATE TABLE public.families (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'המשפחה שלי',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.families TO anon, authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families are readable by anyone with the id"
  ON public.families FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can create a family"
  ON public.families FOR INSERT TO anon, authenticated WITH CHECK (true);

-- פריטי הרשימה, משותפים לכל מי שמחזיק את מזהה המשפחה
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  added_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX items_family_idx ON public.items (family_id, archived, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- שיתוף מבוסס קישור: מי שמחזיק את מזהה המשפחה יכול לנהל את הרשימה שלה
CREATE POLICY "list is shared by family id (select)"
  ON public.items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "list is shared by family id (insert)"
  ON public.items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "list is shared by family id (update)"
  ON public.items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "list is shared by family id (delete)"
  ON public.items FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.items;

-- פרופיל אופציונלי למי שנרשם באימייל, כדי שהשם יעבור בין מכשירים
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  family_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
