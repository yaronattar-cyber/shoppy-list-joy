import { useEffect, useRef, useState } from "react";
import { QUICK_PICKS } from "@/lib/shopping-list";

type Props = {
  count: number;
  onAdd: (name: string) => boolean;
  onGoShopping: () => void;
  onExit: () => void;
};

// מסך 1 — הוספת פריטים
export function AddScreen({ count, onAdd, onGoShopping, onExit }: Props) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const add = (name: string) => {
    if (!onAdd(name)) return;
    setFeedback(`אני על זה! ${name} נוסף לרשימה`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), 2200);
  };

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16 pt-10">
      <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
        מה חסר?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        בחרו במהירות או הקלידו פריט משלכם.
      </p>

      {/* בחירה מהירה */}
      <div className="mt-7 flex flex-wrap gap-2.5">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            type="button"
            onClick={() => add(pick)}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-base font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary active:scale-95"
          >
            {pick}
          </button>
        ))}
      </div>

      {/* הוספה חופשית */}
      <form
        className="mt-7 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          add(value);
          setValue("");
        }}
      >
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
      <div className="mt-4 h-11" aria-live="polite">
        {feedback && (
          <div className="animate-in fade-in slide-in-from-bottom-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground duration-300">
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
