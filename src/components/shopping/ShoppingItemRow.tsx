import { useEffect, useRef } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onOutOfStock: (id: string) => void;
  onOpen: (item: ShoppingItem) => void;
};

const DOUBLE_TAP_MS = 280;
const LONG_PRESS_MS = 550;

// הקשה אחת = נקנה / איפוס; הקשה כפולה או לחיצה ארוכה = חסר במלאי
export function ShoppingItemRow({ item, onToggle, onOutOfStock, onOpen }: Props) {
  const quantity = formatQuantity(item.quantity, item.unit) || "×1";
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const missing = item.outOfStock && !item.completed;

  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current); if (pressTimer.current) clearTimeout(pressTimer.current); }, []);

  const handleClick = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    // ממצב מסומן — הקשה מחזירה מיד למצב רגיל
    if (item.completed || item.outOfStock) { onToggle(item.id); return; }
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      onOutOfStock(item.id);
      return;
    }
    tapTimer.current = setTimeout(() => { tapTimer.current = null; onToggle(item.id); }, DOUBLE_TAP_MS);
  };
  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => { longPressed.current = true; navigator.vibrate?.(30); onOutOfStock(item.id); }, LONG_PRESS_MS);
  };
  const cancelPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null; };

  const label = item.completed ? `בטל סימון ${item.name}` : missing ? `בטל „חסר במלאי” עבור ${item.name}` : `סמן את ${item.name} כנקנה (הקשה כפולה: חסר במלאי)`;

  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 ${item.completed ? "bg-muted/50" : missing ? "bg-destructive/5" : "bg-card"}`}>
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
        title="הקשה: נקנה · הקשה כפולה / לחיצה ארוכה: חסר במלאי"
        className={`h-9 w-9 shrink-0 select-none touch-manipulation rounded-full border ${item.completed ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : missing ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90" : "border-input bg-card text-transparent hover:text-muted-foreground"}`}
      >
        {missing ? <X className="h-5 w-5" strokeWidth={3} /> : <Check className="h-5 w-5" strokeWidth={3} />}
      </Button>
      <Button type="button" variant="ghost" onClick={() => onOpen(item)} className="h-auto min-w-0 justify-start whitespace-normal rounded-md px-0 py-1 text-right hover:bg-transparent">
        <span className="min-w-0 flex-1 text-right">
          <span className={`block break-words text-base font-semibold leading-6 ${item.completed ? "text-foreground line-through opacity-50" : "text-foreground"}`}>{item.name}</span>
          {missing && <span className="block text-xs font-medium text-destructive">חסר במלאי</span>}
          {item.notes && <span className="block break-words text-xs font-normal text-muted-foreground">{item.notes}</span>}
        </span>
      </Button>
      <Button type="button" variant="ghost" onClick={() => onOpen(item)} aria-label={`עריכת ${item.name}`} className="h-9 shrink-0 gap-1 px-1.5 text-muted-foreground">
        <span className="text-sm font-medium">{quantity}</span>
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </li>
  );
}
