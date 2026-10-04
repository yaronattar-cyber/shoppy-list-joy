import { useState } from "react";
import { ChefHat, Loader2, Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { suggestRecipes, type Recipe } from "@/lib/ai/recipes.functions";

type Props = { names: string[]; onAddMissing: (names: string[]) => void };

// מתכונים חכמים לפי המלאי + הוספת חוסרים לסופר הבית
export function RecipesDrawer({ names, onAddMissing }: Props) {
  const fetchRecipes = useServerFn(suggestRecipes);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const run = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await fetchRecipes({ data: { items: [...new Set(names)].slice(0, 200) } });
      if (r.error) toast.error(r.error);
      setRecipes(r.recipes);
    } catch {
      toast.error("לא הצלחנו להציע מתכונים");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" disabled={!names.length} onClick={() => void run()} className="mt-2 h-12 w-full justify-start border-primary/30 bg-card text-primary shadow-sm hover:bg-primary/5 hover:text-primary">
        <ChefHat className="h-5 w-5" />מה מבשלים היום? מתכונים מהמלאי
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent dir="rtl" className="mx-auto max-h-[88vh] max-w-xl rounded-t-2xl border-border bg-card">
          <DrawerHeader className="text-right sm:text-right">
            <DrawerTitle className="flex items-center gap-2 text-xl"><ChefHat className="h-5 w-5 text-primary" />מתכונים מהמלאי</DrawerTitle>
            <DrawerDescription>רעיונות לפי מה שיש בבית. מצרכים חסרים אפשר להוסיף לסופר הבית.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto px-4 pb-6">
            {loading && <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />מחפש רעיונות...</p>}
            {!loading && recipes.map((r) => (
              <article key={r.title} className="rounded-lg border border-border bg-background p-3">
                <h3 className="font-bold text-foreground">{r.title} {r.time && <span className="text-xs font-normal text-muted-foreground">· {r.time}</span>}</h3>
                {r.have.length > 0 && <p className="mt-1 text-sm text-foreground"><span className="font-semibold text-primary">יש בבית:</span> {r.have.join(", ")}</p>}
                {r.missing.length > 0 && <p className="mt-1 text-sm text-foreground"><span className="font-semibold text-destructive">חסר:</span> {r.missing.join(", ")}</p>}
                {r.steps.length > 0 && <ol className="mt-2 list-decimal space-y-0.5 pr-5 text-sm text-muted-foreground">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                {r.missing.length > 0 && (
                  <Button type="button" size="sm" className="mt-3" onClick={() => { onAddMissing(r.missing); toast.success(`${r.missing.length} מצרכים נוספו לסופר הבית`); }}>
                    <Plus className="h-4 w-4" />הוספת החסרים לרשימה
                  </Button>
                )}
              </article>
            ))}
            {!loading && !recipes.length && <p className="py-8 text-center text-muted-foreground">אין הצעות כרגע</p>}
            {!loading && <Button type="button" variant="ghost" className="w-full" onClick={() => void run()}>רעיונות אחרים</Button>}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
