import { useEffect, useRef } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";
import { haptic } from "@/lib/shopping-tools";
import { ROLE_EMOJI, useMemberRole } from "@/hooks/useFamilyMembers";

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
export function ShoppingItemRow({ item, onToggle, onOutOfStock, onOpen, storeLabel, storeTone }: Props) {
  const quantity = formatQuantity(item.quantity, item.unit) || "×1";
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const missing = item.outOfStock && !item.completed;
  const role = useMemberRole(item.addedBy);

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
        title="הקשה: נקנה · לחיצה ארוכה: חסר במלאי"
        className={`h-9 w-9 shrink-0 select-none touch-manipulation rounded-full border ${item.completed ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : missing ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90" : "border-input bg-card text-transparent hover:text-muted-foreground"}`}
      >
        {missing ? <X className="h-5 w-5" strokeWidth={3} /> : <Check className="h-5 w-5" strokeWidth={3} />}
      </Button>
      <Button type="button" variant="ghost" onClick={() => onOpen(item)} className="h-auto min-w-0 justify-start whitespace-normal rounded-md px-0 py-1 text-right hover:bg-transparent">
        <span className="min-w-0 flex-1 text-right">
          <span className={`break-words text-base font-semibold leading-6 ${item.completed ? "text-foreground line-through opacity-50" : "text-foreground"}`}>{item.name}</span>
          {storeLabel && <span className={`mr-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-medium ${storeTone ? "" : "bg-muted text-muted-foreground"}`} style={storeTone ? { backgroundColor: `var(--store-${storeTone})`, color: `var(--store-${storeTone}-fg)` } : undefined}>{storeLabel}</span>}
          {item.addedBy && <span className="mr-2 inline-block rounded-full bg-muted px-2 py-0.5 align-middle text-[11px] font-medium text-muted-foreground">{ROLE_EMOJI[role] ?? "🙂"} {role ? `${role} · ` : ""}{item.addedBy}</span>}
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
