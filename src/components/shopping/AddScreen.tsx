import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBar } from "./CategoryBar";
import { useSpeechToText } from "@/hooks/useSpeechToText";

type Props = {
  userName: string;
  count: number;
  history: string[];
  onAdd: (name: string) => string | null;
  onGoShopping: () => void;
  onOpenFamily: () => void;
  onSpeak?: (text: string) => void;
};

export function AddScreen({ history, onAdd, onSpeak }: Props) {
  const [value, setValue] = useState("");
  const [popup, setPopup] = useState<string | null>(null);
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
  const suggestions = useMemo(() => {
    const query = value.trim();
    if (!query) return [];
    return history.filter((name) => name !== query && name.includes(query)).slice(0, 5);
  }, [history, value]);

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      <form className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2" onSubmit={(event) => { event.preventDefault(); if (add(value)) setValue(""); }}>
        <Button type="button" size="icon" variant={stt.listening ? "destructive" : "outline"} onClick={stt.start} disabled={!stt.supported} aria-label={stt.listening ? "מקשיב, לחצו לעצירה" : "הוספה בדיבור"} title={stt.supported ? "הוספה בדיבור" : "הדפדפן אינו תומך בזיהוי דיבור"} className={`h-12 w-12 rounded-full ${stt.listening ? "animate-pulse" : "bg-card"}`}>
          {stt.supported ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="מה חסר?" aria-label="שם הפריט" autoComplete="off" className="h-12 min-w-0 rounded-md border border-input bg-card px-4 text-base text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
        <Button type="submit" size="icon" className="h-12 w-12 rounded-full" aria-label="הוספת פריט"><Plus className="h-5 w-5" /></Button>
      </form>

      <CategoryBar onAdd={add} />

      {suggestions.length > 0 && <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-sm">{suggestions.map((name) => <li key={name} className="border-b border-border last:border-0"><Button type="button" variant="ghost" onClick={() => { add(name); setValue(""); }} className="h-11 w-full justify-start rounded-none px-3 text-right">{name}</Button></li>)}</ul>}

      <div className="mt-4 min-h-10" aria-live="polite">
        {stt.listening && <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />מקשיב...</div>}
        {!stt.listening && stt.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{stt.error}</p>}
        {!stt.listening && !stt.error && !stt.supported && <p className="text-sm text-muted-foreground">זיהוי דיבור אינו נתמך בדפדפן זה.</p>}
      </div>

      <div className="mt-14 border-t border-border pt-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground" aria-hidden><ShoppingBasket className="h-7 w-7" /></span>
        <h1 className="mt-4 text-2xl font-bold text-foreground">מה נוסיף לרשימה?</h1>
        <p className="mt-1 text-sm text-muted-foreground">אפשר להקליד, לדבר או לבחור קטגוריה</p>
      </div>

      {popup && <div role="status" className="animate-in fade-in slide-in-from-bottom-2 fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-lg border border-border bg-card p-3 text-center shadow-lg duration-200"><p className="font-semibold text-primary">אני על זה!</p><p className="text-sm text-muted-foreground">{popup} נוסף לרשימה</p></div>}
    </section>
  );
}