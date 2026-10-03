import { useRef, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

// צילום מוצר → זיהוי שם → אישור → הוספה לרשימת החנות שנבחרה
export function PhotoProductButton({ storeName, onAdd, compact }: { storeName: string; onAdd: (name: string) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const recognize = useServerFn(recognizeProduct);
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onFile = async (f?: File) => {
    if (!f) return;
    setOpen(true); setBusy(true); setErr(""); setName("");
    try {
      const url = await toDataUrl(f);
      setImg(url);
      const r = await recognize({ data: { image: url } });
      if (r.error) setErr(r.error);
      setName(r.name);
    } catch { setErr("הזיהוי נכשל, נסו שוב"); }
    setBusy(false);
  };

  return (
    <>
      {compact ? (
        <Button type="button" variant="outline" className="h-11 w-11 px-0" aria-label="צילום מוצר והוספה" onClick={() => input.current?.click()}><Camera /></Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => input.current?.click()}><Camera />צילום מוצר והוספה ל{storeName}</Button>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent dir="rtl">
          <DrawerHeader className="text-right">
            <DrawerTitle>זיהוי מוצר מתמונה</DrawerTitle>
            <DrawerDescription>בדקו וערכו את השם לפני ההוספה ל{storeName}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            {img && <img src={img} alt="המוצר שצולם" className="mx-auto max-h-48 rounded-md border border-border object-contain" />}
            {busy ? (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />מזהה מוצר...</p>
            ) : (
              <>
                {err && <p className="text-center text-sm text-destructive">{err}</p>}
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם המוצר" aria-label="שם המוצר" className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <Button type="button" className="h-11 flex-1" disabled={!name.trim()} onClick={() => { onAdd(name.trim()); setOpen(false); }}><Check />הוספה לרשימה</Button>
                  <Button type="button" variant="outline" className="h-11" onClick={() => input.current?.click()}><Camera />צילום חוזר</Button>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
