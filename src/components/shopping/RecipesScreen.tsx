import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Clock, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useRecipes, type Ingredient, type Recipe } from "@/hooks/useRecipes";

const CATEGORIES = ["ארוחת בוקר", "ארוחת צהריים", "ארוחת ערב", "קינוחים", "מהיר", "אפייה", "סלטים"];
const card = "rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm";

export function RecipesScreen({ familyId }: { familyId: string }) {
  const { recipes, loading, addRecipe, deleteRecipe } = useRecipes(familyId);
  const [filter, setFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const shown = useMemo(() => (filter ? recipes.filter((r) => r.category === filter) : recipes), [recipes, filter]);
  const open = recipes.find((r) => r.id === openId);

  if (open) return <RecipeDetail recipe={open} onBack={() => setOpenId(null)} onDelete={() => { void deleteRecipe(open.id); setOpenId(null); }} />;

  return (
    <section dir="rtl" className="mx-auto max-w-2xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><BookOpen className="h-5 w-5 text-primary" />ספר מתכונים</h1>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />מתכון חדש</Button>
      </header>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[null, ...CATEGORIES].map((c) => (
          <Button key={c ?? "all"} size="sm" variant={filter === c ? "default" : "outline"} className="h-8 shrink-0 rounded-full" onClick={() => setFilter(c)}>{c ?? "הכל"}</Button>
        ))}
      </div>
      {loading && <p className="py-10 text-center text-muted-foreground">טוען מתכונים...</p>}
      {!loading && !shown.length && <p className="py-10 text-center text-muted-foreground">אין עדיין מתכונים{filter ? " בקטגוריה זו" : ""}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shown.map((r) => (
          <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className={`${card} p-3 text-right transition hover:shadow-md`}>
            <h3 className="truncate font-bold text-foreground">{r.title}</h3>
            {r.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {r.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{r.category}</span>}
              {r.prep_time_minutes != null && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.prep_time_minutes} דק׳</span>}
              {r.servings != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{r.servings}</span>}
              <span>{r.ingredients.length} מצרכים</span>
            </div>
          </button>
        ))}
      </div>
      <AddRecipeDrawer open={adding} onOpenChange={setAdding} onSave={async (r) => { const ok = await addRecipe(r); if (ok) { toast.success("המתכון נשמר"); setAdding(false); } else toast.error("שמירת המתכון נכשלה"); }} />
    </section>
  );
}

function RecipeDetail({ recipe, onBack, onDelete }: { recipe: Recipe; onBack: () => void; onDelete: () => void }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const steps = recipe.instructions.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <section dir="rtl" className="mx-auto max-w-2xl px-3 pb-28 pt-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowRight className="h-4 w-4" />חזרה</Button>
        <Button variant="ghost" size="icon" aria-label="מחיקת מתכון" className="text-destructive" onClick={() => { if (confirm("למחוק את המתכון?")) onDelete(); }}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className={`${card} p-4`}>
        <h1 className="text-2xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.description && <p className="mt-1 text-muted-foreground">{recipe.description}</p>}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-foreground">
          {recipe.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{recipe.category}</span>}
          {recipe.prep_time_minutes != null && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{recipe.prep_time_minutes} דקות</span>}
          {recipe.servings != null && <span className="flex items-center gap-1"><Users className="h-4 w-4" />{recipe.servings} מנות</span>}
        </div>
        <h2 className="mt-5 font-bold text-foreground">מצרכים</h2>
        <ul className="mt-2 space-y-1">
          {recipe.ingredients.map((i, idx) => (
            <li key={i.id ?? idx}>
              <label className="flex min-h-10 items-center gap-3">
                <Checkbox checked={checked.has(idx)} onCheckedChange={() => setChecked((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })} />
                <span className={checked.has(idx) ? "text-muted-foreground line-through" : "text-foreground"}>{i.item_name}{i.amount != null ? ` · ${i.amount}` : ""}{i.unit ? ` ${i.unit}` : ""}</span>
              </label>
            </li>
          ))}
          {!recipe.ingredients.length && <li className="text-sm text-muted-foreground">לא הוזנו מצרכים</li>}
        </ul>
        <h2 className="mt-5 font-bold text-foreground">אופן ההכנה</h2>
        <ol className="mt-2 list-decimal space-y-2 pr-5 text-foreground">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {!steps.length && <p className="text-sm text-muted-foreground">לא הוזנו הוראות</p>}
      </div>
    </section>
  );
}

type Row = { item_name: string; amount: string; unit: string };

function AddRecipeDrawer({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (r: Parameters<ReturnType<typeof useRecipes>["addRecipe"]>[0]) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [prep, setPrep] = useState("");
  const [servings, setServings] = useState("");
  const [instructions, setInstructions] = useState("");
  const [rows, setRows] = useState<Row[]>([{ item_name: "", amount: "", unit: "" }]);
  const [saving, setSaving] = useState(false);
  const setRow = (i: number, patch: Partial<Row>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const num = (v: string) => (v.trim() && !Number.isNaN(Number(v)) ? Number(v) : null);

  const submit = async () => {
    if (!title.trim()) { toast.error("נא להזין שם מתכון"); return; }
    setSaving(true);
    const ingredients: Ingredient[] = rows.filter((r) => r.item_name.trim()).map((r) => ({ item_name: r.item_name.trim(), amount: num(r.amount), unit: r.unit.trim() }));
    await onSave({ title: title.trim(), description: description.trim(), category, prep_time_minutes: num(prep), servings: num(servings), instructions: instructions.trim(), ingredients });
    setSaving(false);
    setTitle(""); setDescription(""); setCategory(""); setPrep(""); setServings(""); setInstructions(""); setRows([{ item_name: "", amount: "", unit: "" }]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent dir="rtl" className="mx-auto max-h-[92vh] max-w-xl rounded-t-2xl bg-card">
        <DrawerHeader className="text-right sm:text-right">
          <DrawerTitle>מתכון חדש</DrawerTitle>
          <DrawerDescription>המתכון יישמר בספר המתכונים המשפחתי</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 overflow-y-auto px-4 pb-6">
          <Input placeholder="שם המתכון" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="תיאור קצר (לא חובה)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => <Button key={c} type="button" size="sm" variant={category === c ? "default" : "outline"} className="h-8 rounded-full" onClick={() => setCategory(category === c ? "" : c)}>{c}</Button>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" inputMode="numeric" placeholder="זמן הכנה (דקות)" value={prep} onChange={(e) => setPrep(e.target.value)} />
            <Input type="number" inputMode="numeric" placeholder="מספר מנות" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">מצרכים</p>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="flex-1" placeholder="מצרך" value={r.item_name} onChange={(e) => setRow(i, { item_name: e.target.value })} />
                  <Input className="w-16" inputMode="decimal" placeholder="כמות" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} />
                  <Input className="w-20" placeholder="יחידה" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" aria-label="הסרת מצרך" onClick={() => setRows((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => setRows((p) => [...p, { item_name: "", amount: "", unit: "" }])}><Plus className="h-4 w-4" />הוספת מצרך</Button>
          </div>
          <Textarea rows={5} placeholder="אופן ההכנה — כל שלב בשורה נפרדת" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <Button className="w-full" disabled={saving} onClick={() => void submit()}>{saving ? "שומר..." : "שמירת מתכון"}</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
