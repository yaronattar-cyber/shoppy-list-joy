import { useEffect, useRef, useState } from "react";
import { ChefHat, Camera, ImagePlus, Loader2, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { analyzeDish, type DishAnalysis } from "@/lib/ai/analyze-dish.functions";
import { identifyProduct, type ProductIdentification } from "@/lib/ai/identify-product.functions";
import type { ShoppingItem } from "@/lib/shopping-list";

export type ScanMode = "recipe" | "shopping";

type Props = {
  // יתחבר ללוגיקת ה-AI בשלב הבא
  onAnalyze?: (mode: ScanMode, imageDataUrl: string) => void;
  inventory?: ShoppingItem[];
  onCreateRecipeList?: ((dish: string, names: string[]) => void) | undefined;
  onSaveOnline?: ((list: { title: string; store: string; price: string; url: string; image: string; ordered?: boolean }[]) => void) | undefined;
};

// קישורי חיפוש לחנויות אונליין לפי מילות המפתח
const MARKETS = [
  { id: "aliexpress", name: "AliExpress", color: "bg-destructive/10 text-destructive", url: (q: string) => `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(q.replace(/\s+/g, "-"))}.html` },
  { id: "amazon", name: "Amazon", color: "bg-secondary text-secondary-foreground", url: (q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { id: "temu", name: "Temu", color: "bg-accent text-primary", url: (q: string) => `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}` },
] as const;

// השוואה גמישה בין שם רכיב לשם במלאי
const norm = (t: string) => t.trim().toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/(ים|ות)$/u, "");
const inStock = (name: string, inv: ShoppingItem[]) => {
  const n = norm(name);
  return !!n && inv.some((i) => { const m = norm(i.name); return !!m && (m.includes(n) || n.includes(m)); });
};

const MODES: Record<ScanMode, { title: string; hint: string }> = {
  recipe: { title: "סריקת מנה לבישול", hint: "צלמו מנה או מצרכים — ונמצא מתכון" },
  shopping: { title: "סריקת מוצר לקנייה", hint: "צלמו מוצר — ונוסיף אותו לרשימה" },
};

const SCAN_KEY = "visual-scan-pending";

// הקטנת תמונה בדפדפן לפני שמירה/ניתוח (חסכוני בזיכרון, עם גיבוי)
async function toDataUrl(file: File): Promise<string> {
  let src: CanvasImageSource; let w: number; let h: number; let url = "";
  try {
    const bmp = await createImageBitmap(file, { resizeWidth: 1024, resizeQuality: "medium" } as ImageBitmapOptions);
    src = bmp; w = bmp.width; h = bmp.height;
  } catch {
    url = URL.createObjectURL(file);
    const im = new Image(); im.src = url; await im.decode();
    src = im; w = im.naturalWidth; h = im.naturalHeight;
  }
  const scale = Math.min(1, 1024 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  if (url) URL.revokeObjectURL(url);
  if ("close" in src && typeof src.close === "function") src.close();
  return c.toDataURL("image/jpeg", 0.75);
}

// תמונה ממוזערת לשמירה מקומית
async function toThumb(src: string): Promise<string> {
  const im = new Image(); im.src = src; await im.decode();
  const sc = Math.min(1, 120 / Math.max(im.width, im.height));
  const c = document.createElement("canvas"); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
  c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

// שני כפתורי AI חזותיים: בישול / קנייה — עם חלונית צילום משותפת
export function VisualAiScan({ onAnalyze, inventory = [], onCreateRecipeList, onSaveOnline }: Props) {
  const identifyFn = useServerFn(identifyProduct);
  const [product, setProduct] = useState<ProductIdentification | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const analyzeFn = useServerFn(analyzeDish);
  const [result, setResult] = useState<DishAnalysis | null>(null);
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [img, setImg] = useState("");
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // מצלמה חיה בתוך האפליקציה (מונע קריסה במעבר למצלמת המערכת)
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const stopCam = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setLive(false); };
  const startCam = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { cameraRef.current?.click(); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = s; setLive(true);
    } catch { toast.error("אין גישה למצלמה, נסו להעלות מהגלריה"); }
  };
  useEffect(() => { if (live && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [live]);
  useEffect(() => () => stopCam(), []);
  const snap = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const sc = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    setImg(c.toDataURL("image/jpeg", 0.75)); stopCam();
  };

  const close = () => { stopCam(); setMode(null); setImg(""); setBusy(false); setResult(null); setProduct(null); setPicked([]); };

  const analyze = async () => {
    if (!mode) return;
    setBusy(true);
    if (mode === "shopping") {
      try {
        const r = await identifyFn({ data: { image: img } });
        if (r.error || !r.result) toast.error(r.error ?? "הזיהוי נכשל");
        else { setProduct(r.result); setPicked([]); }
      } catch { toast.error("הזיהוי נכשל, נסו שוב"); }
      finally { setBusy(false); }
      return;
    }
    try {
      const r = await analyzeFn({ data: { image: img } });
      if (r.error || !r.result) toast.error(r.error ?? "הניתוח נכשל");
      else setResult(r.result);
    } catch { toast.error("הניתוח נכשל, נסו שוב"); }
    finally { setBusy(false); }
  };

  const marked = result?.ingredients.map((g) => ({ ...g, ok: inStock(g.name, inventory) })) ?? [];
  const missing = marked.filter((g) => !g.ok);

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { setImg(await toDataUrl(f)); }
    catch { toast.error("לא הצלחנו לקרוא את התמונה, נסו שוב"); }
    finally { setBusy(false); }
  };

  // שחזור חלונית ותמונה אחרי שהדפדפן רוענן בחזרה מהמצלמה
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCAN_KEY);
      if (raw) { const p = JSON.parse(raw) as { mode: ScanMode; img: string }; setMode(p.mode); setImg(p.img || ""); }
    } catch { /* ignore */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { mode ? sessionStorage.setItem(SCAN_KEY, JSON.stringify({ mode, img })) : sessionStorage.removeItem(SCAN_KEY); } catch { /* מקום מלא */ }
  }, [mode, img, restored]);

  // ניקוי מצב בעת סגירה
  useEffect(() => { if (!mode) setImg(""); }, [mode]);

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => setMode("recipe")} className="h-14 flex-col gap-1 rounded-2xl border-primary/15 bg-accent/60 text-primary shadow-soft transition-all hover:bg-accent active:scale-[0.98]">
          <ChefHat className="h-5 w-5" />
          <span className="text-sm font-semibold">רוצה לבשל את זה!</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => setMode("shopping")} className="h-14 flex-col gap-1 rounded-2xl border-primary/15 bg-accent/60 text-primary shadow-soft transition-all hover:bg-accent active:scale-[0.98]">
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm font-semibold">אני רוצה את זה!</span>
        </Button>
      </div>

      {mode && (
        <div role="dialog" aria-modal="true" aria-label={MODES[mode].title} data-no-swipe dir="rtl" className="fixed inset-0 z-[60] flex items-end bg-foreground/45">
          <div className="w-full rounded-t-2xl border border-border bg-background pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-start justify-between gap-2 p-4">
              <div className="text-right">
                <h2 className="text-lg font-semibold">{MODES[mode].title}</h2>
                <p className="text-sm text-muted-foreground">{MODES[mode].hint}</p>
              </div>
              <Button type="button" variant="ghost" className="h-9 w-9 px-0" aria-label="סגירה" onClick={close}><X /></Button>
            </div>

            <div className="space-y-3 px-4 pb-6">
              {product ? (
                <div className="max-h-[75dvh] space-y-2 overflow-y-auto">
                  <div className="flex items-center gap-3">
                    <img src={img} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover" />
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground">{product.productTitle}</h3>
                      <p className="text-xs text-muted-foreground">{product.category} · המחירים הערכה בלבד</p>
                    </div>
                  </div>
                  <ul className="grid gap-1.5">
                    {MARKETS.map((m) => {
                      const on = picked.includes(m.id);
                      return (
                        <li key={m.id} className={`flex h-16 items-center gap-2 rounded-xl border p-1.5 transition-all ${on ? "border-primary bg-accent/60" : "border-border bg-card"}`}>
                          <button type="button" aria-label={`בחירת ${m.name}`} onClick={() => setChoice(m.id)} className="flex min-w-0 flex-1 items-center gap-2 text-right">
                            <span className="relative h-12 w-12 shrink-0">
                              <img src={img} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
                              {on && <span className="absolute inset-0 grid place-items-center rounded-lg bg-primary/60 text-xl font-bold text-primary-foreground">✓</span>}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.color}`}>{m.name}</span>
                            <span className="mr-auto text-sm font-semibold text-primary">{product.priceEstimates[m.id]}</span>
                          </button>
                          <Button asChild size="sm" variant="outline" className="h-8 shrink-0 rounded-lg px-2 text-xs">
                            <a href={m.url(product.searchKeywords || product.productTitle)} target="_blank" rel="noopener noreferrer">לחנות</a>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  {choice && (() => {
                    const m = MARKETS.find((x) => x.id === choice)!;
                    const save = async (ordered: boolean) => {
                      const thumb = await toThumb(img);
                      onSaveOnline?.([{ title: product.productTitle, store: m.name, price: product.priceEstimates[m.id], url: m.url(product.searchKeywords || product.productTitle), image: thumb, ordered }]);
                      setPicked((p) => (p.includes(m.id) ? p : [...p, m.id]));
                      setChoice(null);
                      toast.success(ordered ? "נשמר בהזמנות אונליין במלאי" : "נוסף לרשימת קניות אונליין");
                    };
                    return (
                      <div role="dialog" aria-label={`פעולה עבור ${m.name}`} className="space-y-2 rounded-xl border border-primary/30 bg-accent/40 p-2">
                        <p className="text-sm font-semibold">{m.name} — מה לעשות?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button type="button" onClick={() => void save(true)}>נקנה</Button>
                          <Button type="button" variant="outline" onClick={() => void save(false)}>הוסף לרשימת אונליין</Button>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setChoice(null)}>ביטול</Button>
                      </div>
                    );
                  })()}
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => { setProduct(null); setImg(""); setPicked([]); }}>סריקה חדשה</Button>
                </div>
              ) : result ? (
                <div className="max-h-[70dvh] space-y-4 overflow-y-auto">
                  <h3 className="text-xl font-bold text-foreground">{result.dishName}</h3>
                  <section>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">רכיבים</h4>
                    <ul className="space-y-1.5">
                      {marked.map((g, i) => (
                        <li key={i} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${g.ok ? "border-primary/30 bg-accent text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                          <span className="font-medium">{g.ok ? "✓" : "✗"} {g.name}</span>
                          <span className="shrink-0 text-xs opacity-80">{g.quantity} · {g.ok ? "במלאי" : "חסר"}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">אופן הכנה</h4>
                    <ol className="list-decimal space-y-1 pr-5 text-sm text-foreground">
                      {result.instructions.map((st, i) => <li key={i}>{st}</li>)}
                    </ol>
                  </section>
                  <Button type="button" className="h-12 w-full text-base font-bold" disabled={!missing.length} onClick={() => { onCreateRecipeList?.(result.dishName, missing.map((g) => g.name)); close(); }}>
                    {missing.length ? `הוסף רכיבים חסרים לרשימת קניות (${missing.length})` : "כל הרכיבים במלאי 🎉"}
                  </Button>
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => { setResult(null); setImg(""); }}>סריקה חדשה</Button>
                </div>
              ) : img ? (
                <>
                  <div className="relative">
                    <img src={img} alt="התמונה שנבחרה" className="mx-auto max-h-56 rounded-xl border border-border object-contain" />
                    {busy && (
                      <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/60">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />מעבד תמונה...</p>
                      </div>
                    )}
                  </div>
                  <Button type="button" className="h-12 w-full text-base font-bold" disabled={busy} onClick={() => void analyze()}>
                    המשך לניתוח
                  </Button>
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setImg("")}>בחירת תמונה אחרת</Button>
                </>
              ) : (
                live ? (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay playsInline muted className="mx-auto max-h-[55dvh] w-full rounded-xl bg-foreground object-cover" />
                  <Button type="button" className="h-12 w-full text-base font-bold" onClick={snap}><Camera className="h-5 w-5" />צלם</Button>
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={stopCam}>ביטול</Button>
                </div>
                ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="h-20 flex-col gap-1.5 rounded-2xl" onClick={() => void startCam()}>
                    <Camera className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">צילום עכשיו</span>
                  </Button>
                  <Button type="button" variant="outline" className="h-20 flex-col gap-1.5 rounded-2xl" onClick={() => galleryRef.current?.click()}>
                    <ImagePlus className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">העלאה מהגלריה</span>
                  </Button>
                  {busy && <p className="col-span-2 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />מעבד תמונה...</p>}
                </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );
}
