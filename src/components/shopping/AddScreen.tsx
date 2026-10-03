import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Mic, MicOff, Plus, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";
import { Button } from "@/components/ui/button";
import { CategoryBar } from "./CategoryBar";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { HistorySuggestions } from "./HistorySuggestions";
import { matchHistory, type HistoryEntry } from "@/lib/product-history";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  userName: string;
  count: number;
  items: ShoppingItem[];
  history: string[];
  productHistory: HistoryEntry[];
  onAdd: (name: string) => string | null;
  onToggle: (id: string) => void;
  onGoShopping: () => void;
  onOpenFamily: () => void;
  onSpeak?: (text: string) => void;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "בוקר טוב" : h < 18 ? "צהריים טובים" : "ערב טוב";
};

// מסך הבית: כרטיס תקציר, הוספה, מועדפים ופריטים אחרונים
export function AddScreen({ userName, items = [], history = [], productHistory = [], onAdd, onToggle, onGoShopping, onSpeak }: Props) {
  const [value, setValue] = useState("");
  const [popup, setPopup] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const add = (name: string) => {
    const added = onAdd(name);
    if (!added) return null;
    setPopup(added);
    onSpeak?.(`אני על זה! ${added}`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPopup(null), 2200);
    return added;
  };

  const stt = useSpeechToText((text) => { setValue(text); add(text); setTimeout(() => setValue(""), 500); }, setValue);
  const suggestions = useMemo(() => matchHistory(history, productHistory, value), [history, productHistory, value]);
  const pending = items.filter((i) => !i.completed);
  const recent = [...pending].reverse().slice(0, 4);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      {/* כרטיס תקציר */}
      <div className="relative overflow-hidden rounded-3xl bg-hero p-5 text-primary-foreground shadow-soft">
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-primary-foreground/10" aria-hidden />
        <div className="absolute -bottom-14 left-16 h-28 w-28 rounded-full bg-primary-foreground/10" aria-hidden />
        <p className="relative text-sm opacity-90">{greeting()}, {userName}</p>
        <h1 className="relative mt-1 text-2xl font-bold">מה חסר לך היום?</h1>
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-4xl font-extrabold leading-none">{pending.length}</p>
            <p className="mt-1 text-sm opacity-90">{pending.length === 1 ? "פריט ממתין" : "פריטים ממתינים"} לקנייה</p>
          </div>
          <Button type="button" onClick={onGoShopping} variant="secondary" className="h-10 rounded-full px-4 font-semibold shadow-soft">
            לרשימה <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* שדה הוספה */}
      <form className="mt-5 flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-soft transition-shadow focus-within:shadow-glow" onSubmit={(event) => { event.preventDefault(); if (add(value)) setValue(""); }}>
        <Button type="button" size="icon" variant={stt.listening ? "destructive" : "secondary"} onClick={stt.start} disabled={!stt.supported} aria-label={stt.listening ? "מקשיב, לחצו לעצירה" : "הוספה בדיבור"} title={stt.supported ? "הוספה בדיבור" : "הדפדפן אינו תומך בזיהוי דיבור"} className={`relative isolate h-11 w-11 shrink-0 rounded-full ${stt.listening ? "mic-ripple" : "text-primary"}`}>
          {stt.supported ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="מה חסר במקרר?" aria-label="שם הפריט" autoComplete="off" className="h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground" />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" aria-label="הוספת פריט"><Plus className="h-5 w-5" /></Button>
      </form>

      <HistorySuggestions items={suggestions} onPick={(name) => { add(name); setValue(""); }} />

      <div className="min-h-2" aria-live="polite">
        {stt.listening && <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />מקשיב...</div>}
        {!stt.listening && stt.error && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{stt.error}</p>}
      </div>

      <CategoryBar onAdd={add} />

      {/* מיקרופון וסריקת ברקוד */}
      <div className="mt-6 flex items-start justify-center gap-10">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={stt.start}
            disabled={!stt.supported}
            aria-label={stt.listening ? "מקשיב, לחצו לעצירה" : "הוספה בדיבור"}
            className={`grid h-20 w-20 place-items-center rounded-full text-primary-foreground shadow-soft transition-transform active:scale-95 ${stt.listening ? "mic-ripple bg-destructive" : stt.supported ? "bg-hero" : "bg-muted text-muted-foreground"}`}
          >
            {stt.supported ? <Mic className="h-9 w-9" /> : <MicOff className="h-9 w-9" />}
          </button>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {!stt.supported ? "אין זיהוי דיבור" : stt.listening ? "מקשיב..." : "לחצו ודברו"}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="הוספה בסריקת ברקוד"
            className="grid h-20 w-20 place-items-center rounded-full bg-hero text-primary-foreground shadow-soft transition-transform active:scale-95"
          >
            <ScanBarcode className="h-9 w-9" />
          </button>
          <p className="mt-2 text-sm font-medium text-muted-foreground">סריקת ברקוד</p>
        </div>
      </div>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={(name) => add(name)} />

      {/* פריטים אחרונים */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">נוספו לאחרונה</h2>
        {pending.length > 4 && <Button type="button" variant="link" size="sm" onClick={onGoShopping} className="h-auto p-0">הכל ({pending.length})</Button>}
      </div>
      {recent.length ? (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {recent.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <button type="button" onClick={() => onToggle(item.id)} aria-label={`סימון ${item.name} כנקנה`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-primary/50 text-primary transition-colors hover:bg-accent">
                <Check className="h-3.5 w-3.5 opacity-0 hover:opacity-100" />
              </button>
              <span className="min-w-0 flex-1 font-medium text-foreground">{item.name}</span>
              {item.addedBy && <span className="shrink-0 text-xs text-muted-foreground">{item.addedBy}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-sm text-muted-foreground">הרשימה ריקה — אפשר להקליד, לדבר או לבחור למעלה</p>
      )}

      {popup && <div role="status" className="animate-in fade-in slide-in-from-bottom-2 fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-2xl bg-hero p-3 text-center text-primary-foreground shadow-soft duration-200"><p className="font-bold">אני על זה!</p><p className="text-sm opacity-90">{popup} נוסף לרשימה</p></div>}
    </section>
  );
}
