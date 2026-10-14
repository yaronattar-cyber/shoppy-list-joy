import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Calendar, Search, Camera, ChefHat, Clock, Download, Minus, Share2, ShoppingCart, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useRecipes, type Ingredient, type NewRecipe, type Recipe } from "@/hooks/useRecipes";
import { missingIngredientIndexes } from "@/lib/recipe-stock";
import { recipeFromImage } from "@/lib/ai/recipe-from-image.functions";

const CATEGORIES = ["בשרי", "צמחוני", "טבעוני", "קינוחים", "אחר"];
// "לפני X ימים" לתאריך הבישול האחרון
export function cookedAgo(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  return `לפני ${days} ימים`;
}
const card = "rounded-xl border border-border bg-store-header shadow-soft";

type InvRow = { id: string; name: string; quantity: number; unit: string };
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
  const ctx = c.getContext("2d");
  if (!ctx) { img.close(); throw new Error("לא ניתן להכין תמונה"); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
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
  const { recipes, loading, addRecipe, deleteRecipe, refresh } = useRecipes(familyId);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewRecipe | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const shown = useMemo(() => recipes.filter((r) => (!filter || r.category === filter) && r.title.toLowerCase().includes(query.trim().toLowerCase())), [recipes, filter, query]);
  const open = recipes.find((r) => r.id === openId);
  const history = useMemo(() => recipes.filter((r) => r.last_cooked_at).sort((a, b) => (b.last_cooked_at ?? "").localeCompare(a.last_cooked_at ?? "")).slice(0, 5), [recipes]);
  const openForm = (d: NewRecipe | null) => { setDraft(d); setDraftKey((k) => k + 1); setAdding(true); };
  const importCode = () => {
    const code = prompt("הדביקו קוד מתכון משותף");
    if (!code) return;
    const r = decodeShare(code);
    if (!r) { toast.error("קוד מתכון לא תקין"); return; }
    openForm(r);
  };

  if (open) return <Drawer open onOpenChange={(value) => { if (!value) setOpenId(null); }}><DrawerContent dir="rtl" className="mx-auto max-h-[88dvh] max-w-2xl overflow-y-auto bg-card"><DrawerHeader className="sr-only"><DrawerTitle>{open.title}</DrawerTitle><DrawerDescription>פרטי מתכון</DrawerDescription></DrawerHeader><RecipeDetail key={open.id} recipe={open} familyId={familyId} onAddItems={onAddItems} onCooked={async () => { await refresh(); return true; }} onBack={() => setOpenId(null)} onDelete={() => { void deleteRecipe(open.id); setOpenId(null); }} /></DrawerContent></Drawer>;

  return (
    <section dir="rtl" className="mx-auto max-w-2xl px-3 pb-28 pt-4 sm:px-6">
      <h1 className="mb-3 text-center text-xl font-bold text-foreground">ספר המתכונים המשפחתי</h1>
      <div className="mb-3 grid grid-cols-3 gap-2" aria-label="פעולות ספר המתכונים">
        <Button variant="outline" className="h-10 min-w-0 px-2" onClick={() => setSearchOpen(true)}><Search className="h-4 w-4 shrink-0" />חיפוש</Button>
        <Button variant="outline" className="h-10 min-w-0 px-2" onClick={() => setPhotoOpen(true)}><Camera className="h-4 w-4 shrink-0" />הוסף</Button>
        <Button variant={historyOpen ? "default" : "outline"} className="h-10 min-w-0 px-2" aria-expanded={historyOpen} onClick={() => setHistoryOpen((v) => !v)}><Calendar className="h-4 w-4 shrink-0" />היסטוריה</Button>
      </div>
      <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl bg-card">
          <DrawerHeader><DrawerTitle>חיפוש מתכונים</DrawerTitle><DrawerDescription>חיפוש וקטגוריה</DrawerDescription></DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <Input aria-label="חיפוש מתכונים" placeholder="שם המתכון" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="flex flex-wrap gap-2">{[null, ...CATEGORIES].map((c) => <Button key={c ?? "all"} size="sm" variant={filter === c ? "default" : "outline"} onClick={() => setFilter(c)}>{c ?? "הכל"}</Button>)}</div>
            <Button className="w-full" onClick={() => setSearchOpen(false)}>הצג תוצאות</Button>
          </div>
        </DrawerContent>
      </Drawer>
      {historyOpen && <div className={`${card} mb-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-2 text-sm`}>
        <span className="shrink-0 font-bold text-foreground">🍳 היסטוריית בישולים</span>
        <span className="shrink-0 text-muted-foreground">({history.length} מנות)</span>
        {history.map((r) => <Button key={r.id} variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-primary" onClick={() => setOpenId(r.id)}>{r.title}</Button>)}
      </div>}
      {loading && <p className="py-10 text-center text-muted-foreground">טוען מתכונים...</p>}
      {!loading && !shown.length && <p className="py-10 text-center text-muted-foreground">אין עדיין מתכונים{filter ? " בקטגוריה זו" : ""}</p>}
      <div className={`${card} divide-y divide-border overflow-hidden ${shown.length ? "" : "hidden"}`}>
        {shown.map((r) => (
          <Button key={r.id} variant="ghost" onClick={() => setOpenId(r.id)} className="flex h-11 w-full justify-start gap-2 rounded-none px-3 text-right text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{r.title}</span>
            {r.prep_time_minutes != null && <span className="shrink-0 text-muted-foreground">⏱️ {r.prep_time_minutes} דק׳</span>}
            {r.servings != null && <span className="shrink-0 text-muted-foreground">👥 {r.servings}</span>}
          </Button>
        ))}
      </div>
      <AddRecipeDrawer key={draftKey} initial={draft} open={adding} onOpenChange={setAdding} onSave={async (r) => { const ok = await addRecipe(r); if (ok) { toast.success("המתכון נשמר"); setAdding(false); } else toast.error("שמירת המתכון נכשלה"); }} />
      <PhotoRecipeDrawer onManual={() => { setPhotoOpen(false); openForm(null); }} onImport={() => { setPhotoOpen(false); importCode(); }} open={photoOpen} onOpenChange={setPhotoOpen} onResult={(r) => { setPhotoOpen(false); openForm(r); }} />
    </section>
  );
}

function PhotoRecipeDrawer({ open, onOpenChange, onResult, onManual, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; onResult: (r: NewRecipe) => void; onManual: () => void; onImport: () => void }) {
  const [mode, setMode] = useState<"written" | "dish">("written");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPreparing(true);
    try {
      const next = await Promise.all(Array.from(files).map(compressImage));
      setImages((previous) => [...previous, ...next]);
    } catch { toast.error("לא ניתן לפתוח את התמונה"); }
    finally { setPreparing(false); if (camRef.current) camRef.current.value = ""; if (galRef.current) galRef.current.value = ""; }
  };
  const analyze = async () => {
    if (!images.length || busy) return;
    setBusy(true);
    try {
      const res = await recipeFromImage({ data: { images, mode } });
      if (res.error || !res.result) { toast.error(res.error ?? "הניתוח נכשל"); return; }
      const x = res.result;
      onResult({ title: x.title, description: "", category: x.category, prep_time_minutes: x.prep_time_minutes, servings: x.servings, instructions: x.instructions.join("\n"), ingredients: x.ingredients });
      setImages([]);
    } catch { toast.error("הניתוח נכשל, נסו שוב"); }
    finally { setBusy(false); }
  };
  return <Drawer open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DrawerContent dir="rtl" className="mx-auto max-h-[88dvh] max-w-xl overflow-y-auto bg-card">
      <DrawerHeader><DrawerTitle>הוסף מתכון</DrawerTitle><DrawerDescription>תמונות המתכון</DrawerDescription></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy} variant={mode === "written" ? "default" : "outline"} onClick={() => setMode("written")}>מתכון כתוב</Button>
          <Button disabled={busy} variant={mode === "dish" ? "default" : "outline"} onClick={() => setMode("dish")}>מנה מבושלת</Button>
        </div>
        <Button className="w-full" variant="outline" disabled={busy || preparing} onClick={() => camRef.current?.click()}><Camera className="h-4 w-4" />צלם מתכון במצלמה</Button>
        <Button className="w-full" variant="outline" disabled={busy || preparing} onClick={() => galRef.current?.click()}>העלה תמונה/תמונות מהגלריה</Button>
        {!!images.length && <div className="grid grid-cols-3 gap-2">{images.map((image, index) => <div key={index} className="relative min-w-0"><img src={image} alt={`תמונת מתכון ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" /><Button disabled={busy} variant="destructive" size="icon" className="absolute left-1 top-1 h-7 w-7" aria-label={`הסר תמונה ${index + 1}`} onClick={() => setImages((previous) => previous.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button></div>)}</div>}
        {!!images.length && <Button className="w-full" disabled={busy || preparing} onClick={() => void analyze()}>{busy ? "מנתח את התמונות..." : `נתח ${images.length} תמונות`}</Button>}
        {preparing && <p role="status" className="text-center text-sm text-muted-foreground">מכין תמונות...</p>}
        <div className="grid grid-cols-2 gap-2"><Button disabled={busy} variant="ghost" onClick={onManual}><Plus className="h-4 w-4" />מתכון ידני</Button><Button disabled={busy} variant="ghost" onClick={onImport}><Download className="h-4 w-4" />ייבוא מתכון</Button></div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
      </div>
    </DrawerContent>
  </Drawer>;
}

function RecipeDetail({ recipe, familyId, onBack, onDelete, onAddItems, onCooked }: { recipe: Recipe; familyId: string; onBack: () => void; onDelete: () => void; onAddItems: (names: string[]) => void; onCooked: () => Promise<boolean> }) {
  const base = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
  const [servings, setServings] = useState(base ?? 1);
  const ratio = base ? servings / base : 1;
  // מצרכים מסומנים = ייוספו לרשימת הקניות
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [cooking, setCooking] = useState(false);
  const [leftover, setLeftover] = useState<string | null>(null);

  // בחירה מראש של מצרכים חסרים/לא מספיקים במלאי לפי כמות מותאמת
  const selectMissing = async () => {
    const inv = await loadInventory(familyId);
    const next = missingIngredientIndexes(recipe.ingredients, inv, ratio);
    setChecked(next);
    return next;
  };
  useEffect(() => {
    let current = true;
    void loadInventory(familyId).then((inv) => { if (current) setChecked(missingIngredientIndexes(recipe.ingredients, inv, ratio)); });
    return () => { current = false; };
  }, [familyId, recipe.ingredients, ratio]);
  const addSelected = async () => {
    const sel = checked;
    const names = recipe.ingredients.filter((_, i) => sel.has(i)).map((i) => i.item_name);
    if (!names.length) { toast.success("כל המצרכים קיימים במלאי"); return; }
    onAddItems(names);
    toast.success(`${names.length} מצרכים נוספו לרשימת הקניות`);
  };

  const cooked = async () => {
    setCooking(true);
    const { data: deducted, error } = await supabase.rpc("cook_recipe", { _recipe_id: recipe.id, _servings: servings });
    if (error) { setCooking(false); toast.error("עדכון הבישול והמלאי נכשל"); return; }
    await onCooked();
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
        <h1 className="break-words text-2xl font-bold text-foreground">{recipe.title}</h1>
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
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" size="sm" onClick={() => void selectMissing()}>סמן רק חסרים</Button>
            <Button variant="outline" className="h-auto min-h-10 flex-1 whitespace-normal py-2" onClick={() => void addSelected()}><ShoppingCart className="h-4 w-4" />הוסף רכיבים חסרים לרשימת הקניות</Button>
          </div>
        )}
        <h2 className="mt-5 font-bold text-foreground">אופן ההכנה</h2>
        <ol className="mt-2 list-decimal space-y-2 pr-5 text-foreground">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {!steps.length && <p className="text-sm text-muted-foreground">לא הוזנו הוראות</p>}
        {leftover === null ? (
          <Button className="mt-5 w-full" disabled={cooking} onClick={() => void cooked()}><ChefHat className="h-4 w-4" />{cooking ? "מעדכן מלאי..." : "בישלתי את זה היום"}</Button>
        ) : (
          <div className="mt-5 rounded-lg border border-border bg-card p-3">
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
                  <Input className="min-w-0 flex-1" placeholder="מצרך" value={r.item_name} onChange={(e) => setRow(i, { item_name: e.target.value })} />
                  <Input className="w-16" inputMode="decimal" placeholder="כמות" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} />
                  <Input className="w-14 shrink-0" placeholder="יחידה" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
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
