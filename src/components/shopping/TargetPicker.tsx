import { PartyPopper, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AddTarget = { id: string | null; label: string; kind: "store" | "event" };

// חלונית תחתונה: לאיזו חנות / רשימת אירוע לשייך מוצר חדש
export function TargetPicker({ name, targets, onPick, onCancel }: { name: string | null; targets: AddTarget[]; onPick: (t: AddTarget) => void; onCancel: () => void }) {
  if (name === null) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="בחירת רשימה" data-no-swipe className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-soft" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground">לאיזו רשימה להוסיף?</h2>
        <p className="mt-1 text-sm text-muted-foreground">„{name}”</p>
        <div className="mt-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {targets.map((t) => (
            <Button key={`${t.kind}-${t.id ?? "general"}`} type="button" variant={t.kind === "event" ? "secondary" : "outline"} className="h-12 justify-start rounded-xl text-base font-semibold" onClick={() => onPick(t)}>
              {t.kind === "event" ? <PartyPopper className="h-4 w-4" /> : t.id ? <Store className="h-4 w-4" /> : <Tag className="h-4 w-4" />}{t.label}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" className="mt-3 h-10 w-full" onClick={onCancel}>ביטול</Button>
      </div>
    </div>
  );
}
