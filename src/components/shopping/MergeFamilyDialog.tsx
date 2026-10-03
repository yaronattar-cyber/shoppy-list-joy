import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mergeFamilyItems } from "@/lib/product-history";
import { Button } from "@/components/ui/button";

type Props = { from: string; to: string; onDone: (merged: boolean) => void };

// אחרי הצטרפות למשפחה — הצעה להעביר את הפריטים מהרשימה הקודמת
export function MergeFamilyDialog({ from, to, onDone }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("family_id", from)
      .then(({ count: c }) => {
        if (!c) onDone(false);
        else setCount(c);
      });
  }, [from, onDone]);

  if (!count) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <h2 className="text-lg font-bold text-foreground">הצטרפת למשפחה 🎉</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          האם להעביר איתך {count} מוצרים מהרשימה הקודמת שלך לרשימה המשותפת?
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await mergeFamilyItems(from, to);
                onDone(true);
              } catch {
                setBusy(false);
              }
            }}
          >
            {busy ? "מעביר..." : "כן, להעביר"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onDone(false)}>
            לא תודה
          </Button>
        </div>
      </div>
    </div>
  );
}
