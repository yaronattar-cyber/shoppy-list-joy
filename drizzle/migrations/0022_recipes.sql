CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id text NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  prep_time_minutes integer,
  servings integer,
  instructions text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recipes_family_idx ON public.recipes(family_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members select recipes" ON public.recipes FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY "members insert recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members update recipes" ON public.recipes FOR UPDATE TO authenticated USING (public.is_family_member(family_id)) WITH CHECK (public.is_family_member(family_id));
CREATE POLICY "members delete recipes" ON public.recipes FOR DELETE TO authenticated USING (public.is_family_member(family_id));

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  item_name text NOT NULL CHECK (length(item_name) BETWEEN 1 AND 120),
  amount numeric,
  unit text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients(recipe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all recipe ingredients" ON public.recipe_ingredients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND public.is_family_member(r.family_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND public.is_family_member(r.family_id)));