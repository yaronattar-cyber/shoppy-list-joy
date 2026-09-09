import { useState } from "react";

type Props = { onSave: (name: string) => void };

// מסך onboarding — מוצג רק בהפעלה הראשונה (כשאין שם משתמש מקומי)
export function Onboarding({ onSave }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 px-5 backdrop-blur">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
        className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-lg duration-300"
      >
        <h1 className="text-2xl font-black text-foreground">ברוכים הבאים 👋</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          איך לקרוא לכם? השם ישמש לכותרת האישית ולפריטים שתוסיפו.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם משתמש"
          aria-label="שם משתמש"
          className="mt-5 w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-2xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition-transform hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          שמירה והתחלה
        </button>
      </form>
    </div>
  );
}
