ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS last_cooked_at timestamptz;
CREATE OR REPLACE FUNCTION public.cook_recipe(_recipe_id uuid, _servings numeric)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r public.recipes%ROWTYPE; ing record; stock record; needed numeric; used numeric; ratio numeric; changed integer := 0;
BEGIN
 IF auth.uid() IS NULL OR _servings IS NULL OR _servings < 1 THEN RAISE EXCEPTION 'Invalid cooking request'; END IF;
 SELECT * INTO r FROM public.recipes WHERE id = _recipe_id FOR UPDATE;
 IF NOT FOUND OR NOT public.is_family_member(r.family_id) THEN RAISE EXCEPTION 'Recipe unavailable'; END IF;
 ratio := CASE WHEN r.servings > 0 THEN _servings / r.servings ELSE 1 END;
 FOR ing IN SELECT * FROM public.recipe_ingredients WHERE recipe_id = r.id ORDER BY position LOOP
  needed := round(coalesce(ing.amount * ratio, 1), 2);
  FOR stock IN SELECT id, quantity FROM public.items WHERE family_id = r.family_id AND archived = true AND lower(trim(name)) = lower(trim(ing.item_name)) AND lower(trim(unit)) = lower(trim(ing.unit)) ORDER BY id FOR UPDATE LOOP
   EXIT WHEN needed <= 0;
   used := least(stock.quantity, needed);
   IF used <= 0 THEN CONTINUE; END IF;
   IF stock.quantity <= used THEN DELETE FROM public.items WHERE id = stock.id; ELSE UPDATE public.items SET quantity = quantity - used WHERE id = stock.id; END IF;
   needed := needed - used; changed := changed + 1;
  END LOOP;
 END LOOP;
 UPDATE public.recipes SET last_cooked_at = now() WHERE id = r.id;
 RETURN changed;
END;
$$;
REVOKE ALL ON FUNCTION public.cook_recipe(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cook_recipe(uuid, numeric) TO authenticated, service_role;