import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { scanNote } from "@/lib/ai/scan-note.functions";

async function toDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.toDataURL("image/jpeg", 0.75);
}

// "סרוק פתק": צילום/בחירת תמונה → זיהוי פריטים → הוספה לרשימה הפעילה
export function NoteScanButton({ targetName, onAddMany }: { targetName: string; onAddMany: (names: string[]) => Promise<number> }) {
  const input = useRef<HTMLInputElement>(null);
  const scan = useServerFn(scanNote);
  const [busy, setBusy] = useState(false);
  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await scan({ data: { image: await toDataUrl(file) } });
      if (res.error || !res.items) { toast.error(res.error ?? "הסריקה נכשלה"); return; }
      const n = await onAddMany(res.items);
      toast.success(`${n} פריטים נוספו ל${targetName}`);
    } catch { toast.error("הסריקה נכשלה, נסו שוב"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return (
    <>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => input.current?.click()} aria-label="סרוק פתק">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}סרוק פתק
      </Button>
    </>
  );
}
