// חלונית "עוזרת אישית למלאי": צ'אט עם שאלות מהירות על המלאי
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { askInventoryAssistant } from "@/lib/ai/inventory-assistant.functions";
import type { ShoppingItem } from "@/lib/shopping-list";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string };
const WELCOME: Msg = { role: "assistant", text: "שלום! במה אוכל לעזור לך במלאי היום?" };
const CHIPS = ["מה אפשר לבשל?", "כמה קמח יש?", "מוצרים שעומדים להיגמר"];

type Props = { open: boolean; onOpenChange: (o: boolean) => void; items: ShoppingItem[] };

export function InventoryAssistant({ open, onOpenChange, items }: Props) {
  const ask = useServerFn(askInventoryAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await ask({ data: {
        question,
        items: items.slice(0, 200).map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit ?? "", stockStatus: i.stockStatus ?? "full", expiryDate: i.expiryDate ?? "" })),
      } });
      setMsgs((m) => [...m, { role: "assistant", text: res.answer || res.error || "לא קיבלתי תשובה, נסו שוב" }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "אין חיבור לשרת, נסו שוב" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setMsgs([WELCOME]); }}>
      <DrawerContent dir="rtl" className="mx-auto flex max-w-xl flex-col rounded-t-2xl border-border bg-card">
        <DrawerHeader className="text-right sm:text-right">
          <DrawerTitle className="flex items-center gap-2 text-xl"><Bot className="h-5 w-5 text-primary" />עוזרת אישית למלאי</DrawerTitle>
          <DrawerDescription>שאלי כל דבר על המלאי שבבית — כמויות, מתכונים ומה שכמעט נגמר.</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4" style={{ maxHeight: "48vh" }}>
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
              <p className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6",
                m.role === "user" ? "rounded-bl-sm bg-muted text-foreground" : "rounded-br-sm bg-primary/10 text-foreground",
              )}>{m.text}</p>
            </div>
          ))}
          {busy && <p className="flex items-center justify-end gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />חושבת...</p>}
          <div ref={endRef} />
        </div>
        <div className="px-4 pb-2 pt-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <button key={c} type="button" disabled={busy} onClick={() => void send(c)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">
                {c}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="שאל/י אותי משהו על המלאי..."
              className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-base text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={busy || !input.trim()} aria-label="שליחה">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
