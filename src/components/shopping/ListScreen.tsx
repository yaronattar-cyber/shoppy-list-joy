import { useState } from "react";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
};

// מסך 2 — ביצוע הרשימה
export function ListScreen({ items, onToggle, onRename, onRemove, onBack }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const doneCount = items.filter((i) => i.done).length;

  const startEdit = (item: ShoppingItem) => {
    setEditingId(item.id);
    setDraft(item.name);
  };

  const commitEdit = (id: string) => {
    onRename(id, draft);
    setEditingId(null);
  };

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16 pt-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            רשימת קניות לביצוע
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "הרשימה ריקה"
              : `${doneCount} מתוך ${items.length} הושלמו`}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          הוספת פריטים
        </button>
      </header>

      <ul className="mt-7 space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="animate-in fade-in slide-in-from-bottom-1 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm duration-300"
          >
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={item.done}
              aria-label={item.done ? "בטל סימון" : "סמן כהושלם"}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm transition-all duration-200 active:scale-90 ${
                item.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-transparent hover:border-primary"
              }`}
            >
              ✓
            </button>

            {editingId === item.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitEdit(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(item.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                aria-label="עריכת שם הפריט"
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <span
                className={`min-w-0 flex-1 truncate text-base font-semibold transition-all duration-300 ${
                  item.done
                    ? "text-muted-foreground line-through opacity-60"
                    : "text-foreground"
                }`}
              >
                {item.name}
              </span>
            )}

            <button
              type="button"
              onClick={() => startEdit(item)}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              עריכה
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              מחיקה
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          עדיין לא הוספתם פריטים. חזרו למסך ההוספה כדי להתחיל.
        </p>
      )}
    </section>
  );
}
