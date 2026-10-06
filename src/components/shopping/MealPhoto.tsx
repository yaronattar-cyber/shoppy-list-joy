import { useEffect, useRef, useState } from "react";
import { Camera, CookingPot, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// העלאת תמונת מנה לאחסון הפרטי של המשפחה; מחזיר נתיב קובץ
export async function uploadMealPhoto(familyId: string, file: File): Promise<string | null> {
  if (file.size > 5 * 1024 * 1024) { toast.error("התמונה גדולה מדי (עד 5MB)"); return null; }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${familyId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("meal-photos").upload(path, file, { contentType: file.type });
  if (error) { toast.error("העלאת התמונה נכשלה"); return null; }
  return path;
}

const urlCache = new Map<string, string>();
function useSignedUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(path ? urlCache.get(path) ?? null : null);
  useEffect(() => {
    if (!path || urlCache.has(path)) { setUrl(path ? urlCache.get(path) ?? null : null); return; }
    void supabase.storage.from("meal-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) { urlCache.set(path, data.signedUrl); setUrl(data.signedUrl); }
    });
  }, [path]);
  return url;
}

// תמונה ממוזערת עם גרפיקת ברירת מחדל
export function MealThumb({ path, className = "h-10 w-10" }: { path?: string | null | undefined; className?: string }) {
  const url = useSignedUrl(path);
  const [broken, setBroken] = useState(false);
  if (!url || broken) return <span className={`grid shrink-0 place-items-center rounded-md bg-accent text-primary ${className}`}><CookingPot className="h-1/2 w-1/2" /></span>;
  return <img src={url} alt="" onError={() => setBroken(true)} className={`shrink-0 rounded-md object-cover ${className}`} />;
}

// כפתורי צילום/העלאה + תצוגה מקדימה
export function MealPhotoPicker({ familyId, value, onChange }: { familyId: string; value?: string | null | undefined; onChange: (path: string) => void }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    const p = await uploadMealPhoto(familyId, f);
    setBusy(false);
    if (p) onChange(p);
  };
  return (
    <div className="flex items-center gap-3">
      <MealThumb path={value} className="h-16 w-16" />
      <div className="flex flex-1 flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => cam.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}צלם/העלה תמונה</Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => gal.current?.click()}><ImagePlus className="h-4 w-4" />מהגלריה</Button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
