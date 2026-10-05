import { memo, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";
import { haptic } from "@/lib/shopping-tools";
import { loadUserName } from "@/lib/user-name";
import { MembersContext, ROLE_EMOJI, useMemberRole } from "@/hooks/useFamilyMembers";

type Props = {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onOutOfStock: (id: string) => void;
  onOpen: (item: ShoppingItem) => void;
  storeLabel?: string | undefined;
  storeTone?: number | undefined;
};

const LONG_PRESS_MS = 550;

// הקשה = נקנה / איפוס (מיידי); לחיצה ארוכה = חסר במלאי
export const ShoppingItemRow = memo(function ShoppingItemRow({ item, onToggle, onOutOfStock, onOpen, storeLabel, storeTone }: Props) {
  const quantity = formatQuantity(item.quantity, item.unit) || "×1";
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const missing = item.outOfStock && !item.completed;
  const role = useMemberRole(item.addedBy);
  // תגית „הוסיף” רק כשמישהו אחר הוסיף ויש יותר מחבר משפחה אחד
  const memberCount = Object.keys(useContext(MembersContext)).length;
  const showAdder = !!item.addedBy && memberCount > 1 && item.addedBy.trim() !== (loadUserName() ?? "").trim();

  useEffect(() => () => { if (pressTimer.current) clearTimeout(pressTimer.current); }, []);

  const handleClick = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    haptic(15);
    onToggle(item.id);
  };
  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => { longPressed.current = true; haptic([30, 60, 30]); onOutOfStock(item.id); }, LONG_PRESS_MS);
  };
  const cancelPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null; };

  const label = item.completed ? `בטל סימון ${item.name}` : missing ? `בטל „חסר במלאי” עבור ${item.name}` : `סמן את ${item.name} כנקנה (לחיצה ארוכה: חסר במלאי)`;

  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-border px-2 py-1.5 transition-colors last:border-b-0 ${item.completed ? "bg-muted/50" : missing ? "bg-destructive/5" : "bg-card"}`}>
      {/* צ'קבוקס מרובע וקטן, בפרופורציה לגודל הפונט של שם המוצר */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleClick}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={label}
        title="הקשה: נקנה · לחיצה ארוכה: חסר במלאי"
        className={`h-5 w-5 shrink-0 select-none touch-manipulation rounded-[4px] border ${item.completed ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : missing ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90" : "border-input bg-card text-transparent hover:text-muted-foreground"}`}
      >
        {missing ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </Button>
      {/* אזור לחיץ אחד לעריכה: שם + כמות + חץ */}
      <Button type="button" variant="ghost" onClick={() => onOpen(item)} aria-label={`עריכת ${item.name}`} className="h-auto min-w-0 justify-between gap-2 whitespace-normal rounded-md px-0 py-0.5 text-right hover:bg-transparent">
        <span className="min-w-0 flex-1 text-right">
          {/* שם + תגיות בשורה אחת: השם נחתך עם ... ולא יורד שורה */}
          <span className="flex min-w-0 items-center gap-1">
            <span className={`min-w-0 flex-1 truncate text-sm font-semibold leading-5 ${item.completed ? "text-foreground line-through opacity-50" : "text-foreground"}`}>{item.name}</span>
            {storeLabel && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${storeTone ? "" : "bg-muted text-muted-foreground"}`} style={storeTone ? { backgroundColor: `var(--store-${storeTone})`, color: `var(--store-${storeTone}-fg)` } : undefined}>{storeLabel}</span>}
            {showAdder && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{ROLE_EMOJI[role] ?? "🙂"} {role ? `${role} · ` : ""}{item.addedBy}</span>}
          </span>
          {item.completed && <span className="flex items-center gap-1 text-xs font-medium text-primary"><Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />נקנה</span>}
          {missing && <span className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />חסר במלאי</span>}
          {item.notes && <span className="block truncate text-xs font-normal text-muted-foreground">{item.notes}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground" aria-hidden>
          <span className="text-sm font-medium">{quantity}</span>
          <ChevronLeft className="h-4 w-4" />
        </span>
      </Button>
    </li>
  );
});

// רמז חד־פעמי בכניסה הראשונה לרשימה
const HINT_KEY = "hint-long-press-seen";
export function LongPressHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(HINT_KEY)) { setShow(true); localStorage.setItem(HINT_KEY, "1"); } } catch { /* ignore */ }
  }, []);
  if (!show) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
      <span>💡 לחיצה ארוכה על העיגול = חסר במלאי</span>
      <button type="button" onClick={() => setShow(false)} aria-label="סגור רמז" className="text-muted-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}
