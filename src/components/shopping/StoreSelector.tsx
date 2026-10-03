import { useState } from "react";
import { ExternalLink, Pencil, Plus, Star, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { estimateForStore, formatPrice, type BasketLine } from "@/lib/prices";
import type { StoreInfo } from "@/hooks/useStores";

type Props = {
  stores: StoreInfo[];
  active: StoreInfo | null;
  lines: BasketLine[];
  onSelect: (id: string | null) => void;
  onSave: (s: { id?: string; name: string; url: string; is_default?: boolean }) => void;
  onRemove: (id: string) => void;
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// בורר חנויות: צ׳יפים נגללים + כרטיס חנות פעילה + עורך
export function StoreSelector(p: Props) {
  const [editing, setEditing] = useState<{ id?: string; name: string; url: string; is_default?: boolean } | null>(null);
  const total = estimateForStore(p.lines, p.active?.name ?? "");
  const chip = (selected: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
      selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"
    }`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-3 sm:px-6">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]" data-no-swipe>
        <button type="button" className={chip(!p.active)} onClick={() => p.onSelect(null)}>כללי</button>
        {p.stores.map((s) => (
          <button key={s.id} type="button" className={chip(p.active?.id === s.id)} onClick={() => p.onSelect(s.id)}><span className="flex items-center gap-1">{s.is_default && <Star className="h-3.5 w-3.5 fill-current" aria-label="סופר הבית" />}{s.name}</span></button>
        ))}
        <button type="button" aria-label="הוספת חנות" className={`${chip(false)} flex items-center gap-1 border-dashed text-primary`} onClick={() => setEditing({ name: "", url: "" })}>
          <Plus className="h-4 w-4" />חנות
        </button>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
        <Store className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{p.active?.name ?? "רשימה כללית"}</p>
          {p.active?.url ? (
            <a href={p.active.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary" dir="ltr">
              {host(p.active.url)}<ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">{p.active ? "לא הוגדר אתר" : "פריטים ללא חנות מסוימת"}</p>
          )}
        </div>
        <div className="shrink-0 text-left">
          <p className="text-[11px] text-muted-foreground">סל משוער</p>
          <p className="text-sm font-bold text-primary">₪{formatPrice(total)}</p>
        </div>
        {p.active && (
          <Button type="button" variant="ghost" size="icon" aria-label="עריכת חנות" onClick={() => setEditing({ ...p.active! })}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent dir="rtl">
          <DrawerHeader className="text-right">
            <DrawerTitle>{editing?.id ? "עריכת חנות" : "חנות חדשה"}</DrawerTitle>
            <DrawerDescription>לכל חנות רשימה משלה. כתובת האתר תשמש לחישוב מחירים.</DrawerDescription>
          </DrawerHeader>
          {editing && (
            <form
              className="space-y-3 px-4 pb-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.name.trim()) return;
                p.onSave(editing);
                setEditing(null);
              }}
            >
              <label className="block text-sm font-medium">שם החנות
                <input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="לדוגמה: רמי לוי" className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="block text-sm font-medium">כתובת אתר החנות
                <input dir="ltr" inputMode="url" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="www.rami-levy.co.il" className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-left text-base outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium">
                <input type="checkbox" checked={!!editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} className="h-5 w-5 accent-[var(--color-primary)]" />
                <Star className="h-4 w-4 text-primary" />סופר הבית (ברירת מחדל)
              </label>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="h-11 flex-1">שמירה</Button>
                {editing.id && (
                  <Button type="button" variant="outline" className="h-11 text-destructive" onClick={() => { p.onRemove(editing.id!); setEditing(null); }}>
                    <Trash2 />מחיקה
                  </Button>
                )}
              </div>
            </form>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
