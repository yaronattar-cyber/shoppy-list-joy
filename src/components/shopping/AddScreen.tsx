import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { CategoryBar } from "./CategoryBar";
import { useSpeechToText } from "@/hooks/useSpeechToText";

type Props = {
  userName: string;
  count: number;
  onAdd: (name: string) => boolean;
  onGoShopping: () => void;
  onExit: () => void;
  onSpeak?: (text: string) => void;
};

// מסך 1 — הוספת פריטים
export function AddScreen({ userName, count, onAdd, onGoShopping, onExit, onSpeak }: Props) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const add = (name: string) => {
    if (!onAdd(name)) return false;
    setFeedback(`אני על זה! ${name} נוסף לרשימה`);
    onSpeak?.("אני על זה!");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), 2200);
    return true;
  };

  // תמלול סופי — נכנס לשדה ומתווסף אוטומטית
  const stt = useSpeechToText((text) => {
    setValue(text);
    add(text);
    setTimeout(() => setValue(""), 400);
  });

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16 pt-10">
      <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
        שלום {userName}, מה חסר לך היום?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        בחרו קטגוריה, הקלידו או דברו — והפריט נוסף לרשימה.
      </p>

      {/* קטגוריות — אייקונים בשורה נגללת */}
      <CategoryBar onAdd={add} />

      {/* הוספה חופשית + מיקרופון */}
      <form
        className="mt-6 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          add(value);
          setValue("");
        }}
      >
        <button
          type="button"
          onClick={stt.start}
          disabled={!stt.supported}
          aria-label={stt.listening ? "מקשיב, לחצו לעצירה" : "הוספה בדיבור"}
          title={stt.supported ? "הוספה בדיבור" : "הדפדפן אינו תומך בזיהוי דיבור"}
          className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-2xl border transition-all active:scale-95 disabled:opacity-40 ${
            stt.listening
              ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
              : "border-border bg-card text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {stt.supported ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="לדוגמה: אבוקדו"
          aria-label="שם הפריט"
          className="min-w-0 rounded-2xl border border-input bg-card px-4 py-3.5 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition-transform duration-200 hover:brightness-110 active:scale-95"
        >
          הוסף
        </button>
      </form>

      {/* משוב עדין */}
      <div className="mt-4 min-h-11" aria-live="polite">
        {stt.listening && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
            מקשיב...
          </div>
        )}
        {!stt.listening && stt.error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
            {stt.error}
          </div>
        )}
        {!stt.listening && !stt.error && !stt.supported && (
          <div className="rounded-xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
            זיהוי דיבור אינו נתמך בדפדפן זה — ניתן להקליד ידנית.
          </div>
        )}
        {!stt.listening && feedback && (
          <div className="animate-in fade-in slide-in-from-bottom-2 mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground duration-300">
            <span aria-hidden>✓</span>
            {feedback}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onGoShopping}
          className="rounded-2xl bg-foreground px-6 py-3.5 text-base font-bold text-background transition-transform duration-200 hover:brightness-125 active:scale-95"
        >
          יציאה לקניות{count > 0 ? ` (${count})` : ""}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="rounded-2xl border border-border px-6 py-3.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-secondary"
        >
          יציאה מאפליקציה
        </button>
      </div>
    </section>
  );
}
