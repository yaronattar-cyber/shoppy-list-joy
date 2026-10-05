// מסך קניות מלא — מצב "אני בסופר": Wake Lock, קיבוץ לפי קטגוריות, צ'קבוקסים גדולים,
// פריטים שנקנו בתחתית, והצעת חלופות לפריט חסר במלאי.
import { useEffect, useMemo, useState } from "react";
import { Check, HelpCircle, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { setWakeLock, wakeLockSupported } from "@/lib/shopping-tools";
import { formatQuantity } from "@/lib/quantity";
import { CATEGORIES } from "@/lib/categories";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  items: ShoppingItem[];
  /** הקשה על הצ'קבוקס — סימון כנקנה / ביטול */
  onToggle: (id: string) => void;
  /** ביטול "חסר במלאי" (ההצעה עצמה מוסיפה פריט חלופי) */
  onOutOfStock: (id: string) => void;
  /** הוספת פריט חלופי לרשימה */
  onAdd: (name: string) => string | null;
  /** יציאה/סגירה חזרה למסך הקודם */
  onExit: () => void;
};

// קיבוץ לפי קטגוריה — "כללי" בסוף
function groupByCategory(items: ShoppingItem[]) {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || "כללי";
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].sort(([a], [b]) =>
    a === "כללי" ? 1 : b === "כללי" ? -1 : a.localeCompare(b, "he"),
  );
}

// חלופות מאותה קטגוריה: קודם פריטים אחרים ברשימה, ואז אפשרויות קטגוריה מוכרות
function alternativesFor(item: ShoppingItem, items: ShoppingItem[]): string[] {
  const cat = item.category?.trim() || "כללי";
  const sameCat = items
    .filter((i) => i.id !== item.id && (i.category?.trim() || "כללי") === cat)
    .map((i) => i.name);
  if (sameCat.length) return [...new Set(sameCat)];
  const preset = CATEGORIES.find((c) => c.id === cat || c.label === cat);
  return preset?.options?.filter((o) => o !== item.name) ?? [];
}

export function FullScreenShopping({ items, onToggle, onOutOfStock, onAdd, onExit }: Props) {
  const [awake, setAwake] = useState(false);
  const [canWake, setCanWake] = useState(false);
  const [helpFor, setHelpFor] = useState<ShoppingItem | null>(null);

  // Wake Lock: מופעל אוטומטית בכניסה, משתחרר ביציאה, ומופעל מחדש בחזרה לחזית
  useEffect(() => {
    setCanWake(wakeLockSupported());
    let active = true;
    const acquire = async () => {
      if (!active || document.visibilityState !== "visible") return;
      const ok = await setWakeLock(true);
      if (active) setAwake(ok);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
      else void setWakeLock(false);
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      void setWakeLock(false);
    };
  }, []);

  const toggleWake = async () => {
    const ok = await setWakeLock(!awake);
    setAwake(ok);
  };

  // לא נקנו למעלה, שנקנו למטה
  const todo = useMemo(() => items.filter((i) => !i.completed), [items]);
  const done = useMemo(() => items.filter((i) => i.completed), [items]);
  const todoGroups = useMemo(() => groupByCategory(todo), [todo]);
  const alts = useMemo(
    () => (helpFor ? alternativesFor(helpFor, items) : []),
    [helpFor, items],
  );

  return (
    <section dir="rtl" className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* כותרת: יציאה, כותרת, Wake Lock */}
      <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="יציאה" onClick={onExit}>
          <X />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-foreground">קניות</h1>
        {canWake && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-11 w-11 shrink-0 ${awake ? "text-primary" : "text-muted-foreground"}`}
            aria-label={awake ? "מסך דולק" : "הפעלת מסך דולק"}
            aria-pressed={awake}
            onClick={toggleWake}
          >
            <Sun />
          </Button>
        )}
      </header>

      {/* הרשימה המקובצת */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {todoGroups.map(([cat, rows]) => (
          <section key={cat} className="mt-4">
            <h2 className="mb-1 px-1 text-sm font-semibold text-muted-foreground">
              {cat} ({rows.length})
            </h2>
            <ul className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              {rows.map((item) => (
                <li key={item.id} className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-0">
                  {/* צ'קבוקס מרובע וקטן, בפרופורציה לגודל הפונט של שם המוצר */}
                  <button
                    type="button"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border-2 border-input text-transparent transition-colors active:bg-muted hover:border-primary hover:text-primary"
                    aria-label={`סימון ${item.name} כנקנה`}
                    onClick={() => onToggle(item.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5 text-foreground">{item.name}</p>
                    {formatQuantity(item.quantity, item.unit) && (
                      <p className="text-xs text-muted-foreground">{formatQuantity(item.quantity, item.unit)}</p>
                    )}
                  </div>
                  {item.outOfStock && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-10 w-10 shrink-0 rounded-full"
                      aria-label={`חלופות ל־${item.name}`}
                      onClick={() => setHelpFor(item)}
                    >
                      <HelpCircle />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* פריטים שנקנו — תמיד בתחתית */}
        {done.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-1 px-1 text-sm font-semibold text-muted-foreground">נקנו ({done.length})</h2>
            <ul className="overflow-hidden rounded-lg border border-border bg-card/60 shadow-sm">
              {done.map((item) => (
                <li key={item.id} className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-0 opacity-70">
                  <button
                    type="button"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] bg-primary text-primary-foreground"
                    aria-label={`ביטול סימון ${item.name}`}
                    onClick={() => onToggle(item.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <p className="min-w-0 flex-1 truncate text-sm leading-5 text-muted-foreground line-through">{item.name}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!items.length && <p className="mt-12 text-center text-muted-foreground">הרשימה ריקה</p>}
      </div>

      {/* חלונית חלופות מאותה קטגוריה */}
      <Drawer open={!!helpFor} onOpenChange={(open) => !open && setHelpFor(null)}>
        <DrawerContent dir="rtl" className="mx-auto max-w-xl rounded-t-2xl bg-card">
          <DrawerHeader className="text-right sm:text-right">
            <DrawerTitle>אין במלאי? הנה חלופות</DrawerTitle>
            <DrawerDescription>
              {helpFor ? `חלופות בקטגוריה „${helpFor.category?.trim() || "כללי"}” עבור ${helpFor.name}` : ""}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {alts.length ? (
              <ul className="grid gap-2">
                {alts.map((name) => (
                  <li key={name}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-start text-base"
                      onClick={() => {
                        if (helpFor) onOutOfStock(helpFor.id); // מבטל "חסר במלאי"
                        onAdd(name);
                        setHelpFor(null);
                      }}
                    >
                      {name}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">אין חלופות מוכרות לקטגוריה הזו</p>
            )}
          </div>
          <DrawerClose asChild>
            <Button type="button" variant="ghost" className="mx-auto mb-4">סגירה</Button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
    </section>
  );
}
