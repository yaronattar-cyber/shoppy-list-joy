import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Ingredient = { id?: string; item_name: string; amount: number | null; unit: string };
export type Recipe = {
  id: string;
  title: string;
  description: string;
  category: string;
  prep_time_minutes: number | null;
  servings: number | null;
  instructions: string;
  image_url: string | null;
  created_at: string;
  ingredients: Ingredient[];
};
export type NewRecipe = Omit<Recipe, "id" | "created_at" | "image_url">;

// ספר מתכונים משפחתי — נשמר בענן ומוגבל לחברי המשפחה
export function useRecipes(familyId: string | null) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase
      .from("recipes")
      .select("*, recipe_ingredients(id,item_name,amount,unit,position)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });
    if (error) console.error("recipes", error);
    else
      setRecipes(
        (data ?? []).map(({ recipe_ingredients, ...r }) => ({
          ...r,
          ingredients: [...(recipe_ingredients ?? [])].sort((a, b) => a.position - b.position),
        })),
      );
    setLoading(false);
  }, [familyId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addRecipe = useCallback(async (r: NewRecipe) => {
    if (!familyId) return false;
    const { ingredients, ...rest } = r;
    const { data, error } = await supabase.from("recipes").insert({ ...rest, family_id: familyId }).select("id").single();
    if (error || !data) { console.error(error); return false; }
    if (ingredients.length) {
      const { error: e2 } = await supabase.from("recipe_ingredients").insert(
        ingredients.map((i, position) => ({ recipe_id: data.id, item_name: i.item_name, amount: i.amount, unit: i.unit, position })),
      );
      if (e2) console.error(e2);
    }
    await refresh();
    return true;
  }, [familyId, refresh]);

  const deleteRecipe = useCallback(async (id: string) => {
    setRecipes((p) => p.filter((r) => r.id !== id));
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) { console.error(error); void refresh(); }
  }, [refresh]);

  return { recipes, loading, addRecipe, deleteRecipe, refresh };
}
