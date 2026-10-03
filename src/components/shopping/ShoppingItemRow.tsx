import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "@/lib/quantity";
import type { ShoppingItem } from "@/lib/shopping-list";

type Props = {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onOpen: (item: ShoppingItem) => void;
};

export function ShoppingItemRow({ item, onToggle, onOpen }: Props) {
  const quantity = formatQuantity(item.quantity, item.unit) || "×1";
  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-3 py-2.5 last:border-b-0 ${item.completed ? "bg-muted/50" : ""}`}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onToggle(item.id)}
        aria-label={item.completed ? `בטל סימון ${item.name}` : `סמן את ${item.name} כנקנה`}
        aria-pressed={item.completed}
        className={`h-9 w-9 shrink-0 rounded-full border ${item.completed ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "border-input bg-card text-transparent hover:text-muted-foreground"}`}
      >
        <Check className="h-5 w-5" strokeWidth={3} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen(item)}
        className="h-auto min-w-0 justify-start whitespace-normal rounded-md px-0 py-1 text-right hover:bg-transparent"
      >
        <span className="min-w-0 flex-1 text-right">
          <span className={`block break-words text-base font-semibold leading-6 ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {item.name}
          </span>
          {item.notes && <span className="block break-words text-xs font-normal text-muted-foreground">{item.notes}</span>}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen(item)}
        aria-label={`עריכת ${item.name}`}
        className="h-9 shrink-0 gap-1 px-1.5 text-muted-foreground"
      >
        <span className="text-sm font-medium">{quantity}</span>
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </li>
  );
}