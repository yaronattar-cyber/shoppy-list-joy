import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, ListChecks, Users } from "lucide-react";
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

// מסך 1 — בית / הוספה מהירה
export function AddScreen({
  userName,
  count,
  history,
  onAdd,
  onGoShopping,
  onOpenFamily,
  onSpeak,
}: Props) {
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
    timer.current = setTimeout(() => setPopup(null), 2600);
    return added;
  };

  // תמלול סופי — נכנס לשדה ומתווסף אוטומטית
  const stt = useSpeechToText(
    (text) => {
      setValue(text);
      add(text);
      setTimeout(() => setValue(""), 500);
    },
    (text) => setValue(text), // תמלול חי בזמן הדיבור
  );

  // השלמה אוטומטית מהיסטוריית המשפחה
  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    return history
      .filter((name) => name !== q && name.includes(q))
      .slice(0, 5);
  }, [history, value]);

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16 pt-10">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
          שלום {userName}, מה חסר לך היום?
        </h1>
        <button
          type="button"
          onClick={onOpenFamily}
          aria-label="ניהול המשפחה"
          title="ניהול המשפחה"
          className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground bg-card text-foreground shadow-[3px_3px_0_0_var(--color-foreground)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <Users className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        בחרו קטגוריה, הקלידו או דברו — והפריט נוסף לרשימה המשפחתית.
      </p>

      <CategoryBar onAdd={add} />

      {/* הוספה חופשית + מיקרופון */}
      <form
        className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5"
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
          className={`grid h-[54px] w-[54px] shrink-0 place-items-center rounded-2xl border-[3px] border-foreground shadow-[4px_4px_0_0_var(--color-foreground)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-40 ${
            stt.listening
              ? "animate-pulse bg-destructive text-destructive-foreground"
              : "bg-card text-foreground"
          }`}
        >
          {stt.supported ? (
            <Mic className="h-6 w-6" strokeWidth={2.5} />
          ) : (
            <MicOff className="h-6 w-6" strokeWidth={2.5} />
          )}
        </button>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="לדוגמה: אבוקדו"
          aria-label="שם הפריט"
          autoComplete="off"
          className="min-w-0 rounded-2xl border-[3px] border-foreground bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl border-[3px] border-foreground bg-primary px-6 py-3 text-base font-black text-primary-foreground shadow-[4px_4px_0_0_var(--color-foreground)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          הוסף
        </button>
      </form>

      {/* הצעות מהיסטוריית המשפחה */}
      {suggestions.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  add(name);
                  setValue("");
                }}
                className="rounded-full border-2 border-foreground bg-secondary px-3 py-1.5 text-sm font-bold text-foreground active:scale-95"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* משוב */}
      <div className="mt-4 min-h-12" aria-live="polite">
        {stt.listening && (
          <div className="inline-flex items-center gap-2 rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive">
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
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onGoShopping}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-foreground bg-foreground px-6 py-3.5 text-base font-black text-background shadow-[5px_5px_0_0_var(--color-primary)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          <ListChecks className="h-5 w-5" strokeWidth={2.5} />
          יציאה לקניות{count > 0 ? ` (${count})` : ""}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        טיפ: החליקו עם האצבע שמאלה כדי לעבור לרשימה.
      </p>

      {/* חלונית אישור „אני על זה!” */}
      {popup && (
        <div
          role="status"
          className="animate-in fade-in slide-in-from-bottom-4 fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-3xl border-[3px] border-foreground bg-accent p-4 text-center shadow-[6px_6px_0_0_var(--color-foreground)] duration-300"
        >
          <p className="text-xl font-black text-accent-foreground">אני על זה! 🛒</p>
          <p className="mt-1 text-sm font-bold text-accent-foreground">
            {popup} נוסף לרשימה
          </p>
        </div>
      )}
    </section>
  );
}
