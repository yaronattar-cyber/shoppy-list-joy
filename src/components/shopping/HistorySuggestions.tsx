import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

// צ׳יפים של הצעות מההיסטוריה מתחת לשדה ההוספה
export function HistorySuggestions({ items, onPick }: { items: string[]; onPick: (name: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="הצעות מההיסטוריה">
      {items.map((name) => (
        <Button key={name} type="button" size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(name)} className="h-8 rounded-full bg-card px-3 text-sm">
          <History className="h-3.5 w-3.5 text-muted-foreground" />{name}
        </Button>
      ))}
    </div>
  );
}
