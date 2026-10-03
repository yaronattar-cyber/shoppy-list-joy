import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { recognizeProduct } from "@/lib/ai/recognize-product.functions";

// הקטנת התמונה בדפדפן לפני שליחה
async function toDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

// שמירת מצב החלונית — שורד רענון של הדפדפן בחזרה מהמצלמה בטלפון
const KEY = "photo-pending";
type Pending = { img: string; name: string; err: string };
const save = (p: Pending | null) => {
  try { p ? sessionStorage.setItem(KEY, JSON.stringify(p)) : sessionStorage.removeItem(KEY); } catch { /* מקום מלא */ }
};

// צילום מוצר → זיהוי שם → אישור ידני → הוספה לרשימת החנות שנבחרה
export function PhotoProductButton({ storeName, onAdd, compact }: { storeName: string; onAdd: (name: string) => string | null | void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const recognize = useServerFn(recognizeProduct);
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [added, setAdded] = useState("");

  const run = async (url: string) => {
    setBusy(true); setErr("");
    try {
      const r = await recognize({ data: { image: url } });
      setName(r.name ?? ""); setErr(r.error ?? "");
      save({ img: url, name: r.name ?? "", err: r.error ?? "" });
    } catch { setErr("הזיהוי נכשל, נסו שוב"); }
    setBusy(false);
  };

  // שחזור חלונית פתוחה אחרי רענון
  useEffect(() => {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as Pending;
      setImg(p.img); setName(p.name); setErr(p.err); setOpen(true);
      if (!p.name && !p.err) void run(p.img);
    } catch { save(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (f?: File) => {
    if (!f) return;
    setOpen(true); setBusy(true); setErr(""); setName(""); setAdded(""); setImg("");
    try {
      const url = await toDataUrl(f);
      setImg(url);
      save({ img: url, name: "", err: "" });
      await run(url);
    } catch { setErr("הזיהוי נכשל, נסו שוב"); setBusy(false); }
  };

  const close = () => { setOpen(false); save(null); };

  const confirm = () => {
    const n = name.trim();
    if (!n) return;
    const res = onAdd(n);
    if (res === null) { setErr("ההוספה נכשלה — ודאו שאתם מחוברים למשפחה ונסו שוב"); return; }
    setAdded(typeof res === "string" ? res : n);
    save(null);
    setTimeout(() => setOpen(false), 1800);
  };

  return (
    <>
      {compact ? (
        <Button type="button" variant="outline" className="h-11 w-11 px-0" aria-label="צילום מוצר והוספה" onClick={() => input.current?.click()}><Camera /></Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => input.current?.click()}><Camera />צילום מוצר והוספה ל{storeName}</Button>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {/* חלונית קבועה: נסגרת רק בלחיצה על X או אחרי הוספה — לא מנגיעה מחוץ או מחזרה מהמצלמה */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`הוספה לרשימת ${storeName}`} data-no-swipe dir="rtl" className="fixed inset-0 z-[60] flex items-end bg-foreground/45" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="w-full rounded-t-2xl border border-border bg-background pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-start justify-between gap-2 p-4">
              <div className="text-right">
                <h2 className="text-lg font-semibold">הוספה לרשימת {storeName}</h2>
                <p className="text-sm text-muted-foreground">בדקו וערכו את שם המוצר, ואז לחצו על הכפתור הירוק</p>
              </div>
              <Button type="button" variant="ghost" className="h-9 w-9 px-0" aria-label="סגירה" onClick={close}><X /></Button>
            </div>
            <div className="space-y-3 px-4 pb-6">
              {img && <img src={img} alt="המוצר שצולם" className="mx-auto max-h-48 rounded-md border border-border object-contain" />}
              {busy ? (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />מזהה מוצר...</p>
              ) : added ? (
                <p className="flex items-center justify-center gap-2 rounded-md bg-primary/10 p-3 text-center font-semibold text-primary"><Check className="h-5 w-5" />„{added}” נוסף לרשימת {storeName}</p>
              ) : (
                <>
                  {err && <p className="text-center text-sm text-destructive">{err}</p>}
                  <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirm(); }} placeholder="שם המוצר" aria-label="שם המוצר" className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring" />
                  <Button type="button" className="h-16 w-full text-lg font-bold shadow-lg ring-2 ring-primary/30" disabled={!name.trim()} onClick={confirm}><Check className="h-6 w-6" />הוספה לרשימת {storeName}</Button>
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => input.current?.click()}><Camera />צילום חוזר</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
