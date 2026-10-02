import { useState } from "react";
import { formatDateTime, parsePastedList, type ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  onAdd: (name: string) => string | null;
  onAddMany: (names: string[]) => Promise<number>;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMarkAll: (completed: boolean) => void;
  onArchive: () => void;
  onBack: () => void;
  onShop: () => void;
};

const btn =
  "rounded-2xl border-[3px] border-foreground px-4 py-2.5 text-sm font-black shadow-[3px_3px_0_0_var(--color-foreground)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

// מסך 2 — ניהול הרשימה
export function ListScreen(p: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [quick, setQuick] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const doneCount = p.items.filter((i) => i.completed).length;
  const allDone = p.items.length > 0 && doneCount === p.items.length;

  const commitEdit = (id: string) => {
    p.onRename(id, draft);
    setEditingId(null);
  };

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16 pt-10">
      <h1 className="text-3xl font-black tracking-tight text-foreground">רשימת קניות לביצוע</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {p.items.length === 0 ? "הרשימה ריקה" : `${doneCount} מתוך ${p.items.length} הושלמו`}
      </p>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          p.onAdd(quick);
          setQuick("");
        }}
      >
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="הוספה מהירה..."
          aria-label="הוספה מהירה"
          className="min-w-0 flex-1 rounded-2xl border-[3px] border-foreground bg-card px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" className={`${btn} bg-primary text-primary-foreground`}>הוסף</button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => p.onMarkAll(!allDone)} className={`${btn} bg-card text-foreground`}>
          {allDone ? "בטל סימון הכל" : "סמן הכל"}
        </button>
        <button type="button" onClick={() => setImportOpen(true)} className={`${btn} bg-card text-foreground`}>
          ייבוא מ-Google Keep
        </button>
        <button
          type="button"
          disabled={doneCount === 0}
          onClick={p.onArchive}
          className={`${btn} bg-secondary text-foreground disabled:opacity-40`}
        >
          ארכוב שהושלמו
        </button>
      </div>

      <ul className="mt-6 space-y-2.5">
        {p.items.map((item) => (
          <li
            key={item.id}
            className="animate-in fade-in slide-in-from-bottom-1 flex items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-3.5 duration-300"
          >
            <button
              type="button"
              onClick={() => p.onToggle(item.id)}
              aria-pressed={item.completed}
              aria-label={item.completed ? "בטל סימון" : "סמן כהושלם"}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm transition-all active:scale-90 ${
                item.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
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
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-base outline-none"
              />
            ) : (
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-semibold ${item.completed ? "text-muted-foreground line-through opacity-60" : "text-foreground"}`}>
                  {item.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  נוצר ע״י {item.addedBy || "אנונימי"} ב־{formatDateTime(item.createdAt)}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingId(item.id);
                setDraft(item.name);
              }}
              className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              עריכה
            </button>
            <button
              type="button"
              onClick={() => p.onRemove(item.id)}
              className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              מחיקה
            </button>
          </li>
        ))}
      </ul>

      {p.items.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          אין פריטים פעילים. הוסיפו למעלה או חזרו לבית.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button type="button" onClick={p.onBack} className={`${btn} bg-card text-foreground`}>חזרה לבית</button>
        <button type="button" onClick={p.onShop} className={`${btn} bg-foreground text-background`}>יציאה לקניות 🛒</button>
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setImportOpen(false)}>
          <div
            role="dialog"
            aria-label="ייבוא מ-Google Keep"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border-[3px] border-foreground bg-card p-5"
          >
            <h2 className="text-xl font-black text-foreground">ייבוא מ-Google Keep</h2>
            <p className="mt-1 text-sm text-muted-foreground">הדביקו את הרשימה — כל שורה תהפוך לפריט.</p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={8}
              className="mt-3 w-full rounded-2xl border-2 border-foreground bg-background p-3 text-base outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setImportOpen(false)} className={`${btn} bg-card text-foreground`}>ביטול</button>
              <button
                type="button"
                onClick={async () => {
                  await p.onAddMany(parsePastedList(pasted));
                  setPasted("");
                  setImportOpen(false);
                }}
                className={`${btn} bg-primary text-primary-foreground`}
              >
                ייבוא {parsePastedList(pasted).length || ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
