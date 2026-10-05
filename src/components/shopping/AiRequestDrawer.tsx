// חלונית "בקשה חופשית": AI מפרק טקסט חופשי לפריטים, המשתמש מאשר ומוסיף לחנות הנבחרת
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { parseShoppingRequest, type AiItem } from "@/lib/ai/parse-request.functions";
import { formatQuantity, toEntryText } from "@/lib/quantity";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; storeName?: string | undefined; onAddMany: (names: string[]) => Promise<number> };

export function AiRequestDrawer({ open, onOpenChange, storeName, onAddMany }: Props) {
  const parse = useServerFn(parseShoppingRequest);
  const [text, setText] = useState("");
  const [items, setItems] = useState<AiItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setText(""); setItems(null); setError(""); };
  const run = async () => {
    setBusy(true); setError("");
    try {
      const res = await parse({ data: { text } });
      if (res.error) { setError(res.error); toast.error(res.error); }
      else if (!res.items.length) setError("לא זוהו מוצרים בבקשה");
      else setItems(res.items);
    } catch { setError("אין חיבור לשרת, נסו שוב"); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!items?.length) return;
    await onAddMany(items.map((i) => toEntryText(i.name, i.quantity, i.unit)));
    reset(); onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
        <DrawerHeader className="text-right sm:text-right">
          <DrawerTitle>בקשה חופשית</DrawerTitle>
          <DrawerDescription>כתבו מה צריך במילים שלכם, ונפרק לפריטים{storeName ? ` לרשימת ${storeName}` : ""}.</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 px-4">
          {!items ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="למשל: צריך 2 קילו עגבניות, חלב לליאו, שלוש חבילות פסטה ומשהו לקינוח"
              className="w-full rounded-md border border-input bg-background p-3 outline-none focus:ring-2 focus:ring-ring" />
          ) : (
            <ul className="max-h-72 overflow-auto rounded-lg border border-border">
              {items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
                  <span className="min-w-0 flex-1">{i.name}</span>
                  <span className="text-sm text-muted-foreground">{formatQuantity(i.quantity, i.unit)}</span>
                  <Button size="icon" variant="ghost" aria-label={`הסר ${i.name}`} onClick={() => setItems(items.filter((_, j) => j !== idx))}><X /></Button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {items ? <Button variant="outline" onClick={() => setItems(null)}>חזרה לעריכה</Button> : <DrawerClose asChild><Button variant="outline">ביטול</Button></DrawerClose>}
          {items ? <Button onClick={confirm} disabled={!items.length}>הוסף {items.length} פריטים</Button>
            : <Button onClick={run} disabled={busy || !text.trim()}>{busy && <Loader2 className="animate-spin" />}{busy ? "מפרק..." : "פרק לפריטים"}</Button>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
