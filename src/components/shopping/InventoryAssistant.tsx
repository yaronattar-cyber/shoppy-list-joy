// חלונית "עוזרת אישית למלאי": ממשק קולי עם אפשרות הקלדה
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Keyboard, Mic, Send } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { askInventoryAssistant } from "@/lib/ai/inventory-assistant.functions";
import { useSpeech } from "@/hooks/useSpeech";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { ShoppingItem } from "@/lib/shopping-list";
import { cn } from "@/lib/utils";

const WELCOME = "שלום! במה אוכל לעזור לך במלאי היום?";
const CHIPS = ["מה אפשר לבשל?", "כמה קמח יש?", "מוצרים שעומדים להיגמר"];
type Phase = "idle" | "listening" | "processing" | "speaking";
const PHASE_LABEL: Record<Phase, string> = { idle: "לחצו על המיקרופון ודברו", listening: "מקשיב...", processing: "מעבד...", speaking: "מדבר..." };

type Props = { open: boolean; onOpenChange: (o: boolean) => void; items: ShoppingItem[] };

export function InventoryAssistant({ open, onOpenChange, items }: Props) {
  const ask = useServerFn(askInventoryAssistant);
  const { speak } = useSpeech();
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState(WELCOME);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setHeard(question);
    setBusy(true);
    let text = "";
    try {
      const res = await ask({ data: {
        question,
        items: items.slice(0, 200).map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit ?? "", stockStatus: i.stockStatus ?? "full", expiryDate: i.expiryDate ?? "" })),
      } });
      text = res.answer || res.error || "לא קיבלתי תשובה, נסו שוב";
    } catch {
      text = "אין חיבור לשרת, נסו שוב";
    } finally {
      setBusy(false);
    }
    setAnswer(text);
    speak(text);
    setSpeaking(true);
  };

  const stt = useSpeechToText((t) => void send(t), (t) => setHeard(t));

  // מעקב אחר סיום ההקראה
  useEffect(() => {
    if (!speaking) return;
    const id = window.setInterval(() => {
      if (!window.speechSynthesis?.speaking) setSpeaking(false);
    }, 300);
    return () => window.clearInterval(id);
  }, [speaking]);

  const phase: Phase = stt.listening ? "listening" : busy ? "processing" : speaking ? "speaking" : "idle";

  const toggleMic = () => {
    if (busy) return;
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    setSpeaking(false);
    if (!stt.listening) setHeard("");
    stt.start();
  };

  const reset = () => {
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    setHeard(""); setAnswer(WELCOME); setSpeaking(false); setTyping(false); setInput("");
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DrawerContent dir="rtl" className="mx-auto flex h-[82dvh] max-w-xl flex-col rounded-t-2xl border-border bg-card">
        <DrawerHeader className="pb-1 text-right sm:text-right">
          <DrawerTitle className="flex items-center gap-2 text-xl"><Bot className="h-5 w-5 text-primary" />עוזרת אישית למלאי</DrawerTitle>
          <DrawerDescription>שאלו בקול על כמויות, מתכונים ומה שכמעט נגמר.</DrawerDescription>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-5 pt-2 text-center">
          <p className={cn("text-2xl font-bold transition-colors", phase === "idle" ? "text-muted-foreground" : "text-primary")} aria-live="polite">
            {PHASE_LABEL[phase]}
          </p>
          {heard && <p className="text-base italic leading-7 text-muted-foreground">״{heard}״</p>}
          <p className="whitespace-pre-wrap text-xl font-medium leading-9 text-foreground">{answer}</p>
          {stt.error && <p className="text-sm text-destructive">{stt.error}</p>}
        </div>

        <div className="space-y-3 px-4 pb-6 pt-3">
          <div className="flex flex-wrap justify-center gap-1.5">
            {CHIPS.map((c) => (
              <button key={c} type="button" disabled={busy} onClick={() => void send(c)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50">
                {c}
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-center py-2">
            {phase === "listening" && (
              <>
                <span className="absolute h-20 w-20 animate-ping rounded-full bg-primary/30" />
                <span className="absolute h-28 w-28 animate-pulse rounded-full bg-primary/10" />
              </>
            )}
            <button type="button" onClick={toggleMic} disabled={busy} aria-label={stt.listening ? "עצירת הקשבה" : "התחלת הקשבה"}
              className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg ring-4 ring-primary/20 transition-transform active:scale-95 disabled:opacity-60",
                phase === "processing" && "animate-pulse",
              )}>
              <Mic className="h-9 w-9" />
            </button>
            <button type="button" onClick={() => setTyping((t) => !t)} aria-label="הקלדה"
              className={cn("absolute left-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors", typing && "border-primary text-primary")}>
              <Keyboard className="h-4 w-4" />
            </button>
          </div>

          {typing && (
            <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2">
              <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="שאל/י אותי משהו על המלאי..."
                className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-base text-foreground outline-none focus:ring-2 focus:ring-ring" />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={busy || !input.trim()} aria-label="שליחה">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
