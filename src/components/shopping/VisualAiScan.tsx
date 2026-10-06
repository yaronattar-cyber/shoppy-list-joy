import { useEffect, useRef, useState } from "react";
import { ChefHat, Camera, ImagePlus, Loader2, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ScanMode = "recipe" | "shopping";

type Props = {
  // יתחבר ללוגיקת ה-AI בשלב הבא
  onAnalyze?: (mode: ScanMode, imageDataUrl: string) => void;
};

const MODES: Record<ScanMode, { title: string; hint: string }> = {
  recipe: { title: "סריקת מנה לבישול", hint: "צלמו מנה או מצרכים — ונמצא מתכון" },
  shopping: { title: "סריקת מוצר לקנייה", hint: "צלמו מוצר — ונוסיף אותו לרשימה" },
};

// הקטנת תמונה בדפדפן לפני שמירה/ניתוח
async function toDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

// שני כפתורי AI חזותיים: בישול / קנייה — עם חלונית צילום משותפת
export function VisualAiScan({ onAnalyze }: Props) {
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [img, setImg] = useState("");
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const close = () => { setMode(null); setImg(""); setBusy(false); };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { setImg(await toDataUrl(f)); } finally { setBusy(false); }
  };

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
              {img ? (
                <>
                  <div className="relative">
                    <img src={img} alt="התמונה שנבחרה" className="mx-auto max-h-56 rounded-xl border border-border object-contain" />
                    {busy && (
                      <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/60">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />מעבד תמונה...</p>
                      </div>
                    )}
                  </div>
                  <Button type="button" className="h-12 w-full text-base font-bold" disabled={busy} onClick={() => onAnalyze?.(mode, img)}>
                    המשך לניתוח
                  </Button>
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setImg("")}>בחירת תמונה אחרת</Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="h-20 flex-col gap-1.5 rounded-2xl" onClick={() => cameraRef.current?.click()}>
                    <Camera className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">צילום עכשיו</span>
                  </Button>
                  <Button type="button" variant="outline" className="h-20 flex-col gap-1.5 rounded-2xl" onClick={() => galleryRef.current?.click()}>
                    <ImagePlus className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">העלאה מהגלריה</span>
                  </Button>
                  {busy && <p className="col-span-2 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />מעבד תמונה...</p>}
                </div>
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
