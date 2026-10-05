import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Mic, MicOff, Plus, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "./BarcodeScanner";
import { Button } from "@/components/ui/button";
import { CategoryBar } from "./CategoryBar";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { HistorySuggestions } from "./HistorySuggestions";
import { matchHistory, type HistoryEntry } from "@/lib/product-history";
import type { ShoppingItem } from "@/lib/shopping-list";

import { TargetPicker, type AddTarget } from "./TargetPicker";
export type { AddTarget };

type Props = {
  userName: string;
  count: number;
  items: ShoppingItem[];
  history: string[];
  productHistory: HistoryEntry[];
  targets: AddTarget[];
  onAddTo: (name: string, target: AddTarget) => string | null;
  onToggle: (id: string) => void;
  onGoShopping: () => void;
  onOpenFamily: () => void;
  onSpeak?: (text: string) => void;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "בוקר טוב" : h < 18 ? "צהריים טובים" : "ערב טוב";
};

// מסך הבית: כותרת קומפקטית, שורת הוספה ופריטים אחרונים
export function AddScreen({ userName, items = [], history = [], productHistory = [], targets, onAddTo, onToggle, onGoShopping }: Props) {
  const [value, setValue] = useState("");
  const [popup, setPopup] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanDraft, setScanDraft] = useState<string | null>(null); // שלב אישור אחרי סריקה
  const [picking, setPicking] = useState<string | null>(null); // מוצר שממתין לבחירת רשימה
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const showPopup = (text: string) => {
    setPopup(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPopup(null), 2200);
  };

  // הוספה: אם יש יותר מיעד אחד — שואלים לאיזו רשימה
  const add = (name: string) => {
    const n = name.trim();
    if (!n) return null;
    if (targets.length) { setPicking(n); return n; }
    const t = targets[0];
    if (!t) return null;
    const added = onAddTo(n, t);
    if (added) showPopup(added);
    return added;
  };
  // בחירה מהצעות/קטגוריות/דיבור ממלאת את השדה וממתינה ללחיצה על הוסף
  const fill = (name: string) => { setValue(name); inputRef.current?.focus(); return name; };

  const stt = useSpeechToText((text) => fill(text), setValue);
  const suggestions = useMemo(() => matchHistory(history, productHistory, value), [history, productHistory, value]);
  const pending = items.filter((i) => !i.completed);
  const recent = [...pending].reverse().slice(0, 4);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-lg font-bold tracking-tight text-foreground">{greeting()}, {userName}</h1>
        <Button type="button" onClick={onGoShopping} variant="secondary" aria-label={`${pending.length} ברשימה — פתיחת רשימת הקניות`} className="h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/15 active:scale-95">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          {pending.length} ברשימה
        </Button>
      </header>

      {/* שדה הוספה */}
      <form className="mt-4 flex items-center gap-1 rounded-2xl border border-border/70 bg-card p-1.5 shadow-soft transition-all focus-within:border-primary/30 focus-within:shadow-glow" onSubmit={(event) => { event.preventDefault(); if (add(value)) setValue(""); }}>
        <Button type="button" size="icon" variant="ghost" onClick={stt.start} disabled={!stt.supported} aria-label={stt.listening ? "מקשיב, לחצו לעצירה" : "הוספה בדיבור"} title={stt.supported ? "הוספה בדיבור" : "הדפדפן אינו תומך בזיהוי דיבור"} className={`relative isolate h-10 w-10 shrink-0 rounded-xl transition-all active:scale-95 ${stt.listening ? "mic-ripple bg-destructive/10 text-destructive" : "text-primary hover:bg-accent"}`}>
          {stt.supported ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => setScannerOpen(true)} aria-label="הוספה בסריקת ברקוד" title="סריקת ברקוד" className="h-10 w-10 shrink-0 rounded-xl text-primary transition-all hover:bg-accent active:scale-95">
          <ScanBarcode className="h-5 w-5" />
        </Button>
        <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} placeholder="מה חסר במקרר?" aria-label="שם הפריט" autoComplete="off" className="h-10 min-w-0 flex-1 bg-transparent px-1 text-base text-foreground outline-none placeholder:text-muted-foreground" />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl transition-all active:scale-95" aria-label="הוספת פריט"><Plus className="h-5 w-5" /></Button>
      </form>

      <HistorySuggestions items={suggestions} onPick={(name) => fill(name)} />

      <div className="min-h-2" aria-live="polite">
        {stt.listening && <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />מקשיב...</div>}
        {!stt.listening && stt.error && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{stt.error}</p>}
      </div>

      <CategoryBar onAdd={fill} />

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={(name) => setScanDraft(name)} />

      {/* אישור ועריכת שם לפני הוספת מוצר שנסרק */}
      {scanDraft !== null && (
        <div role="dialog" aria-modal="true" aria-label="אישור מוצר שנסרק" className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-lg font-bold text-foreground">נמצא מוצר — בדקו את השם</h2>
            <p className="mt-1 text-sm text-muted-foreground">אפשר לערוך את השם לפני ההוספה לרשימה</p>
            <input
              value={scanDraft}
              onChange={(event) => setScanDraft(event.target.value)}
              aria-label="שם המוצר שנסרק"
              autoFocus
              className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl font-semibold"
                onClick={() => {
                  const name = scanDraft.trim();
                  setScanDraft(null);
                  if (name) add(name);
                }}
              >
                <Check className="h-4 w-4" /> הוספה לרשימה
              </Button>
              <Button type="button" variant="secondary" className="h-11 flex-1 rounded-xl font-semibold" onClick={() => setScanDraft(null)}>
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}

      <TargetPicker name={picking} targets={targets} onCancel={() => setPicking(null)} onPick={(t) => { const n = picking ?? ""; setPicking(null); const added = onAddTo(n, t); if (added) showPopup(`${added} → ${t.label}`); }} />

      {/* פריטים אחרונים */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <span className="h-4 w-1.5 rounded-full bg-primary" aria-hidden />
            נוספו לאחרונה
          </h2>
          {pending.length > 4 && <Button type="button" variant="link" size="sm" onClick={onGoShopping} className="h-auto p-0">הכל ({pending.length})</Button>}
        </div>
        {recent.length ? (
          <ul className="mt-3 space-y-2">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25 active:scale-[0.99]">
                <button type="button" onClick={() => onToggle(item.id)} aria-label={`סימון ${item.name} כנקנה`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-primary/40 text-primary transition-all hover:border-primary hover:bg-accent active:scale-90">
                  <Check className="h-3.5 w-3.5 opacity-0 hover:opacity-100" />
                </button>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{item.name}</span>
                {item.addedBy && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.addedBy}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">הרשימה ריקה — אפשר להקליד, לדבר או לבחור למעלה</p>
        )}
      </section>

      {popup && <div role="status" className="animate-in fade-in slide-in-from-bottom-2 fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-2xl bg-hero p-3 text-center text-primary-foreground shadow-soft duration-200"><p className="font-bold">אני על זה!</p><p className="text-sm opacity-90">{popup} נוסף לרשימה</p></div>}
    </section>
  );
}
