import { useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Camera, ChefHat, Clock, Download, Minus, Share2, ShoppingCart, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useRecipes, type Ingredient, type NewRecipe, type Recipe } from "@/hooks/useRecipes";
import { recipeFromImage } from "@/lib/ai/recipe-from-image.functions";

const CATEGORIES = ["ארוחת בוקר", "ארוחת צהריים", "ארוחת ערב", "קינוחים", "מהיר", "אפייה", "סלטים"];
// "לפני X ימים" לתאריך הבישול האחרון
export function cookedAgo(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  return `לפני ${days} ימים`;
}
const card = "rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-sm";

type InvRow = { id: string; name: string; quantity: number; unit: string };
const norm = (s: string) => s.trim().toLowerCase();
const findInv = (inv: InvRow[], name: string) => inv.find((r) => norm(r.name) === norm(name)) ?? inv.find((r) => norm(r.name).includes(norm(name)) || norm(name).includes(norm(r.name)));
const sameUnit = (a: string, b: string) => !a.trim() || !b.trim() || norm(a) === norm(b);
const round = (n: number) => Math.round(n * 100) / 100;
const scaleIng = (i: Ingredient, ratio: number) => (i.amount != null ? round(i.amount * ratio) : null);

async function loadInventory(familyId: string): Promise<InvRow[]> {
  const { data, error } = await supabase.from("items").select("id,name,quantity,unit").eq("family_id", familyId).eq("archived", true);
  if (error) { console.error(error); return []; }
  return data ?? [];
}

// הקטנת תמונה לפני שליחה ל-AI (עד ~1.5MB)
async function compressImage(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  return c.toDataURL("image/jpeg", 0.8);
}

// קוד שיתוף מתכון = JSON מקודד base64 (ללא מזהים משפחתיים)
const encodeShare = (r: NewRecipe) => btoa(unescape(encodeURIComponent(JSON.stringify(r))));
function decodeShare(code: string): NewRecipe | null {
  try {
    const r = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!r?.title || !Array.isArray(r.ingredients)) return null;
    return { title: String(r.title), description: String(r.description ?? ""), category: String(r.category ?? ""), prep_time_minutes: r.prep_time_minutes ?? null, servings: r.servings ?? null, instructions: String(r.instructions ?? ""), ingredients: r.ingredients.map((i: any) => ({ item_name: String(i.item_name), amount: i.amount ?? null, unit: String(i.unit ?? "") })) };
  } catch { return null; }
}

export function RecipesScreen({ familyId, onAddItems }: { familyId: string; onAddItems: (names: string[]) => void }) {
  const { recipes, loading, addRecipe, deleteRecipe, markCooked } = useRecipes(familyId);
  const [filter, setFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewRecipe | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const shown = useMemo(() => (filter ? recipes.filter((r) => r.category === filter) : recipes), [recipes, filter]);
  const open = recipes.find((r) => r.id === openId);
  const history = useMemo(() => recipes.filter((r) => r.last_cooked_at).sort((a, b) => b.last_cooked_at!.localeCompare(a.last_cooked_at!)).slice(0, 5), [recipes]);
  const openForm = (d: NewRecipe | null) => { setDraft(d); setDraftKey((k) => k + 1); setAdding(true); };
  const importCode = () => {
    const code = prompt("הדביקו קוד מתכון משותף");
    if (!code) return;
    const r = decodeShare(code);
    if (!r) { toast.error("קוד מתכון לא תקין"); return; }
    openForm(r);
  };

  if (open) return <RecipeDetail recipe={open} familyId={familyId} onAddItems={onAddItems} onCooked={() => markCooked(open.id)} onBack={() => setOpenId(null)} onDelete={() => { void deleteRecipe(open.id); setOpenId(null); }} />;

  return (
    <section dir="rtl" className="mx-auto max-w-2xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><BookOpen className="h-5 w-5 text-primary" />ספר מתכונים</h1>
        <div className="flex gap-1.5">
          <Button size="icon" variant="ghost" aria-label="ייבוא מתכון משותף" onClick={importCode}><Download className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setPhotoOpen(true)}><Camera className="h-4 w-4" />הוסף מתכון מתמונה/מצלמה</Button>
          <Button size="sm" onClick={() => openForm(null)}><Plus className="h-4 w-4" />מתכון חדש</Button>
        </div>
      </header>
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[null, ...CATEGORIES].map((c) => (
          <Button key={c ?? "all"} size="sm" variant={filter === c ? "default" : "outline"} className="h-8 shrink-0 rounded-full" onClick={() => setFilter(c)}>{c ?? "הכל"}</Button>
        ))}
      </div>
      {history.length > 0 && !filter && (
        <div className={`${card} mb-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-2 text-sm`}>
          <span className="shrink-0 font-bold text-foreground">🍳 היסטוריית בישולים</span>
          <span className="shrink-0 text-muted-foreground">({history.length} מנות)</span>
          {history.map((r) => (
            <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-primary">{r.title}</button>
          ))}
        </div>
      )}
      {loading && <p className="py-10 text-center text-muted-foreground">טוען מתכונים...</p>}
      {!loading && !shown.length && <p className="py-10 text-center text-muted-foreground">אין עדיין מתכונים{filter ? " בקטגוריה זו" : ""}</p>}
      <div className={`${card} divide-y divide-emerald-100/60 overflow-hidden ${shown.length ? "" : "hidden"}`}>
        {shown.map((r) => (
          <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm transition hover:bg-primary/5">
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{r.title}</span>
            {r.prep_time_minutes != null && <span className="shrink-0 text-muted-foreground">⏱️ {r.prep_time_minutes} דק׳</span>}
            {r.servings != null && <span className="shrink-0 text-muted-foreground">👥 {r.servings}</span>}
          </button>
        ))}
      </div>
      <AddRecipeDrawer key={draftKey} initial={draft} open={adding} onOpenChange={setAdding} onSave={async (r) => { const ok = await addRecipe(r); if (ok) { toast.success("המתכון נשמר"); setAdding(false); } else toast.error("שמירת המתכון נכשלה"); }} />
      <PhotoRecipeDrawer open={photoOpen} onOpenChange={setPhotoOpen} onResult={(r) => { setPhotoOpen(false); openForm(r); }} />
    </section>
  );
}

function PhotoRecipeDrawer({ open, onOpenChange, onResult }: { open: boolean; onOpenChange: (o: boolean) => void; onResult: (r: NewRecipe) => void }) {
  const [mode, setMode] = useState<"written" | "dish">("written");
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const image = await compressImage(f);
      const res = await recipeFromImage({ data: { image, mode } });
      if (res.error || !res.result) { toast.error(res.error ?? "הניתוח נכשל"); return; }
      const x = res.result;
      onResult({ title: x.title, description: "", category: "", prep_time_minutes: x.prep_time_minutes, servings: x.servings, instructions: x.instructions.join("\n"), ingredients: x.ingredients });
    } catch (e) { console.error(e); toast.error("הניתוח נכשל, נסו שוב"); }
    finally { setBusy(false); if (camRef.current) camRef.current.value = ""; if (galRef.current) galRef.current.value = ""; }
  };
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
        <DrawerHeader className="text-right sm:text-right">
          <DrawerTitle>מתכון מתמונה</DrawerTitle>
          <DrawerDescription>המתכון שיזוהה ייפתח בטופס לבדיקה לפני שמירה</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 px-4 pb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={mode === "written" ? "default" : "outline"} onClick={() => setMode("written")}>📝 מתכון כתוב</Button>
            <Button variant={mode === "dish" ? "default" : "outline"} onClick={() => setMode("dish")}>🍲 מנה מבושלת</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={busy} onClick={() => camRef.current?.click()}><Camera className="h-4 w-4" />צילום</Button>
            <Button variant="outline" disabled={busy} onClick={() => galRef.current?.click()}>גלריה</Button>
          </div>
          {busy && <p className="text-center text-sm text-muted-foreground">מנתח את התמונה...</p>}
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function RecipeDetail({ recipe, familyId, onBack, onDelete, onAddItems, onCooked }: { recipe: Recipe; familyId: string; onBack: () => void; onDelete: () => void; onAddItems: (names: string[]) => void; onCooked: () => Promise<boolean> }) {
  const base = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
  const [servings, setServings] = useState(base ?? 1);
  const ratio = base ? servings / base : 1;
  // מצרכים מסומנים = ייוספו לרשימת הקניות
  const [checked, setChecked] = useState<Set<number>>(() => new Set(recipe.ingredients.map((_, i) => i)));
  const [cooking, setCooking] = useState(false);
  const [leftover, setLeftover] = useState<string | null>(null);

  // בחירה מראש של מצרכים חסרים/לא מספיקים במלאי לפי כמות מותאמת
  const selectMissing = async () => {
    const inv = await loadInventory(familyId);
    const next = new Set<number>();
    recipe.ingredients.forEach((i, idx) => {
      const m = findInv(inv, i.item_name);
      const need = scaleIng(i, ratio);
      if (!m || (need != null && sameUnit(m.unit, i.unit) && Number(m.quantity) < need)) next.add(idx);
    });
    setChecked(next);
    return next;
  };
  const addSelected = async () => {
    const sel = checked.size === recipe.ingredients.length ? await selectMissing() : checked;
    const names = recipe.ingredients.filter((_, i) => sel.has(i)).map((i) => i.item_name);
    if (!names.length) { toast.success("כל המצרכים קיימים במלאי"); return; }
    onAddItems(names);
    toast.success(`${names.length} מצרכים נוספו לרשימת הקניות`);
  };

  const cooked = async () => {
    setCooking(true);
    const ok = await onCooked();
    if (!ok) { setCooking(false); toast.error("השמירה נכשלה"); return; }
    // הורדת כמויות המצרכים מהמלאי
    const inv = await loadInventory(familyId);
    let deducted = 0;
    for (const i of recipe.ingredients) {
      const m = findInv(inv, i.item_name);
      if (!m) continue;
      const need = scaleIng(i, ratio) ?? 1;
      if (!sameUnit(m.unit, i.unit)) continue;
      const left = round(Number(m.quantity) - need);
      const { error } = left > 0
        ? await supabase.from("items").update({ quantity: left }).eq("id", m.id)
        : await supabase.from("items").delete().eq("id", m.id);
      if (!error) deducted++;
    }
    setCooking(false);
    toast.success(`בתאבון! ${deducted ? `${deducted} מצרכים עודכנו במלאי` : "נשמר בהיסטוריית הבישולים"}`);
    setLeftover(String(servings));
  };

  const saveLeftover = async () => {
    const n = Number(leftover);
    setLeftover(null);
    if (!n || n <= 0) return;
    const { error } = await supabase.from("items").insert({ family_id: familyId, name: recipe.title, quantity: n, unit: "מנות", category: "prepared-meal", completed: true, archived: true, added_by: "ספר מתכונים" });
    if (error) toast.error("שמירת המנה במלאי נכשלה");
    else toast.success("המנה נשמרה במלאי תחת ארוחות מוכנות");
  };

  const share = async () => {
    const { id: _i, created_at: _c, image_url: _u, last_cooked_at: _l, ...rest } = recipe;
    const code = encodeShare({ ...rest, ingredients: recipe.ingredients.map((i) => ({ item_name: i.item_name, amount: i.amount, unit: i.unit })) });
    const text = `מתכון: ${recipe.title}\nלייבוא בספר המתכונים לחצו על כפתור הייבוא והדביקו את הקוד:\n${code}`;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, text });
      else { await navigator.clipboard.writeText(code); toast.success("קוד המתכון הועתק"); }
    } catch { /* בוטל */ }
  };

  const steps = recipe.instructions.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <section dir="rtl" className="mx-auto max-w-2xl px-3 pb-28 pt-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowRight className="h-4 w-4" />חזרה</Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => void share()}><Share2 className="h-4 w-4" />שתף מתכון</Button>
          <Button variant="ghost" size="icon" aria-label="מחיקת מתכון" className="text-destructive" onClick={() => { if (confirm("למחוק את המתכון?")) onDelete(); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className={`${card} p-4`}>
        <h1 className="text-2xl font-bold text-foreground">{recipe.title}</h1>
        {recipe.description && <p className="mt-1 text-muted-foreground">{recipe.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground">
          {recipe.category && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{recipe.category}</span>}
          {recipe.prep_time_minutes != null && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{recipe.prep_time_minutes} דקות</span>}
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <Button variant="outline" size="icon" className="h-7 w-7" aria-label="פחות מנות" onClick={() => setServings((s) => Math.max(1, s - 1))}><Minus className="h-3.5 w-3.5" /></Button>
            <span className="min-w-12 text-center">{servings} מנות</span>
            <Button variant="outline" size="icon" className="h-7 w-7" aria-label="יותר מנות" onClick={() => setServings((s) => s + 1)}><Plus className="h-3.5 w-3.5" /></Button>
          </span>
        </div>
        <h2 className="mt-5 font-bold text-foreground">מצרכים</h2>
        <ul className="mt-2 space-y-1">
          {recipe.ingredients.map((i, idx) => {
            const amt = scaleIng(i, ratio);
            return (
              <li key={i.id ?? idx}>
                <label className="flex min-h-10 items-center gap-3">
                  <Checkbox checked={checked.has(idx)} onCheckedChange={() => setChecked((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })} />
                  <span className="text-foreground">{i.item_name}{amt != null ? ` · ${amt}` : ""}{i.unit ? ` ${i.unit}` : ""}</span>
                </label>
              </li>
            );
          })}
          {!recipe.ingredients.length && <li className="text-sm text-muted-foreground">לא הוזנו מצרכים</li>}
        </ul>
        {recipe.ingredients.length > 0 && (
          <div className="mt-2 flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => void selectMissing()}>סמן רק חסרים</Button>
            <Button variant="outline" className="flex-1" onClick={() => void addSelected()}><ShoppingCart className="h-4 w-4" />הוסף רכיבים חסרים לרשימת הקניות</Button>
          </div>
        )}
        <h2 className="mt-5 font-bold text-foreground">אופן ההכנה</h2>
        <ol className="mt-2 list-decimal space-y-2 pr-5 text-foreground">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {!steps.length && <p className="text-sm text-muted-foreground">לא הוזנו הוראות</p>}
        {leftover === null ? (
          <Button className="mt-5 w-full" disabled={cooking} onClick={() => void cooked()}><ChefHat className="h-4 w-4" />{cooking ? "מעדכן מלאי..." : "בישלתי את זה היום"}</Button>
        ) : (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-card p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">כמה מנות נשארו? יישמרו במלאי תחת ארוחות מוכנות</p>
            <div className="flex gap-2">
              <Input type="number" inputMode="numeric" min={0} value={leftover} onChange={(e) => setLeftover(e.target.value)} className="w-24" />
              <Button className="flex-1" onClick={() => void saveLeftover()}>שמור במלאי</Button>
              <Button variant="ghost" onClick={() => setLeftover(null)}>לא נשאר</Button>
            </div>
          </div>
        )}
        {recipe.last_cooked_at && <p className="mt-1.5 text-center text-xs text-muted-foreground">בושל לאחרונה: {cookedAgo(recipe.last_cooked_at)}</p>}
      </div>
    </section>
  );
}

type Row = { item_name: string; amount: string; unit: string };

function AddRecipeDrawer({ open, onOpenChange, onSave, initial }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (r: NewRecipe) => Promise<void>; initial?: NewRecipe | null }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [prep, setPrep] = useState(initial?.prep_time_minutes != null ? String(initial.prep_time_minutes) : "");
  const [servings, setServings] = useState(initial?.servings != null ? String(initial.servings) : "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [rows, setRows] = useState<Row[]>(initial?.ingredients.length ? initial.ingredients.map((i) => ({ item_name: i.item_name, amount: i.amount != null ? String(i.amount) : "", unit: i.unit })) : [{ item_name: "", amount: "", unit: "" }]);
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
