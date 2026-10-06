import { useState } from "react";
import { ChevronDown, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WishItem } from "@/hooks/useOnlineWishlist";

type Props = {
  embedded?: boolean;
  items: WishItem[];
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onRemoveStore: (store: string) => void;
};

// אזור "קניות אונליין" מקובץ לפי חנות
export function OnlineWishlist({ items, onToggle, onRename, onRemove, onRemoveStore, embedded = false }: Props) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const stores = [...new Set(items.map((i) => i.store))];

  return (
    <section className={embedded ? "mt-3" : "mt-6 rounded-2xl border border-border/60 bg-card shadow-soft"}>
      {!embedded && <Button type="button" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex h-auto w-full items-center justify-between px-4 py-3">
        <span className="text-base font-bold text-foreground">🛍️ קניות אונליין ({items.length})</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>}
      {(embedded || open) && (
        <div className="space-y-4 px-3 pb-3">
          {!items.length && <p className="text-sm text-muted-foreground">עדיין אין מוצרים בקניות אונליין.</p>}
          {stores.map((store) => (
            <div key={store}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary">{store}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { if (confirm(`למחוק את כל רשימת ${store}?`)) onRemoveStore(store); }}>
                  <Trash2 className="h-3.5 w-3.5" />מחיקת רשימה
                </Button>
              </div>
              <ul className="space-y-1.5">
                {items.filter((i) => i.store === store).map((i) => (
                  <li key={i.id} className={`flex items-center gap-2 rounded-xl border border-border/60 bg-background p-2 ${i.done ? "opacity-60" : ""}`}>
                    <button type="button" onClick={() => onToggle(i.id)} aria-label={`סימון ${i.title}`} className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 text-xs ${i.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>{i.done ? "✓" : ""}</button>
                    {i.image && <img src={i.image} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover" />}
                    <div className="min-w-0 flex-1">
                      {editing === i.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onRename(i.id, draft.trim()); setEditing(null); }}>
                          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setEditing(null)} aria-label="שם המוצר" className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm" />
                        </form>
                      ) : (
                        <p className={`truncate text-sm font-medium text-foreground ${i.done ? "line-through" : ""}`}>{i.title}</p>
                      )}
                      <p className="text-xs font-semibold text-primary">{i.price} <span className="font-normal text-muted-foreground">· הערכה בלבד</span></p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 shrink-0 rounded-lg px-2 text-xs">
                      <a href={i.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" />לקנייה</a>
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="עריכה" onClick={() => { setEditing(i.id); setDraft(i.title); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" aria-label="מחיקה" onClick={() => onRemove(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
