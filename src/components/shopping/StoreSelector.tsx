import { useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Pencil, Plus, Star, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { estimateForStore, formatPrice, type BasketLine } from "@/lib/prices";
import type { ShoppingItem } from "@/lib/shopping-list";
import type { StoreInfo } from "@/hooks/useStores";
import type { EventList } from "@/hooks/useEvents";

type Props = {
  stores: StoreInfo[];
  active: StoreInfo | null;
  lines: BasketLine[];
  onSelect: (id: string | null) => void;
  onSave: (s: { id?: string; name: string; url: string; is_default?: boolean }) => void;
  onRemove: (id: string) => void;
  onAdd?: (name: string) => void;
  events?: EventList[];
  activeEvent?: EventList | null;
  onSelectEvent?: (id: string | null) => void;
  onCreateEvent?: (name: string) => void;
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// בורר חנויות ואירועים: תפריט נגלל אחד לחנויות ולרשימות אירוע + כרטיס חנות פעילה + עורך
export function StoreSelector(p: Props) {
  const [editing, setEditing] = useState<{ id?: string; name: string; url: string; is_default?: boolean } | null>(null);
  const [msg, setMsg] = useState("");
  const [copyOpen, setCopyOpen] = useState(false);
  const [onlyTodo, setOnlyTodo] = useState(true);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventName, setEventName] = useState("");
  const all = p.lines as ShoppingItem[];
  const copyItems = onlyTodo ? all.filter((i) => !i.completed) : all;
  // שמות מוצרים בלבד – שורה לכל מוצר, להדבקה בחיפוש באתר
  const text = copyItems.length ? copyItems.map((i) => i.name).join("\n") : "אין פריטים להעתקה";
  const copyText = async (t: string) => {
    try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
  };
  const total = estimateForStore(p.lines, p.active?.name ?? "");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-3 sm:px-6">
      {/* תפריט נפתח לבחירת חנות או אירוע */}
      <div className="pb-2">
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm"><Store />חנויות ואירועים<ChevronDown className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-60 overflow-y-auto text-right">
            <DropdownMenuLabel className="text-xs text-muted-foreground">רשימות ביתיות</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => p.onSelect(null)} className={!p.active && !p.activeEvent ? "font-bold text-primary" : ""}>
              {!p.active && !p.activeEvent && <Check />}כללי
            </DropdownMenuItem>
            {p.stores.map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => p.onSelect(s.id)} className={p.active?.id === s.id && !p.activeEvent ? "font-bold text-primary" : ""}>
                {p.active?.id === s.id && !p.activeEvent && <Check />}{s.name}{s.is_default && <Star className="fill-current" aria-label="סופר הבית" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">רשימות אירוע</DropdownMenuLabel>
            {p.events?.map((e) => (
              <DropdownMenuItem key={e.id} onSelect={() => p.onSelectEvent?.(e.id)} className={p.activeEvent?.id === e.id ? "font-bold text-primary" : ""}>
                {p.activeEvent?.id === e.id && <Check />}🎉 {e.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => setCreatingEvent(true)} className="text-primary"><Plus />אירוע חדש</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setEditing({ name: "", url: "" })} className="text-primary"><Plus />הוספת חנות</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {creatingEvent && (
        <form className="mb-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (eventName.trim()) { p.onCreateEvent?.(eventName); setEventName(""); setCreatingEvent(false); } }}>
          <input autoFocus value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="שם האירוע (למשל: על האש שבת)" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" size="sm" disabled={!eventName.trim()}>צור</Button>
          <Button type="button" variant="ghost" size="icon" aria-label="ביטול" onClick={() => setCreatingEvent(false)}>✕</Button>
        </form>
      )}

      {/* כרטיס החנות מוצג רק כשאין אירוע פעיל */}
      {!p.activeEvent && (
        <>
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
          {p.active?.url && p.lines.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => { setOnlyTodo(p.lines.some((l) => !l.completed)); setMsg(""); setCopyOpen(true); }}>
              <Copy />מעבר לאתר והעתקת רשימה
            </Button>
          )}
        </>
      )}

      <Drawer open={copyOpen} onOpenChange={setCopyOpen}>
        <DrawerContent dir="rtl">
          <DrawerHeader className="text-right">
            <DrawerTitle>העתקת רשימה ל{p.active?.name}</DrawerTitle>
            <DrawerDescription>בדקו את הרשימה, העתיקו, ואז עברו לאתר והדביקו בחיפוש.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <label className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
              <input type="checkbox" checked={onlyTodo} onChange={(e) => { setOnlyTodo(e.target.checked); setMsg(""); }} className="h-5 w-5 accent-[var(--color-primary)]" />
              רק פריטים שטרם נקנו
            </label>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-sm text-foreground">{text}</pre>
            {msg && <p className="animate-fade-in text-center text-sm font-semibold text-primary">{msg}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1" disabled={!copyItems.length} onClick={async () => {
                const ok = await copyText(text);
                setMsg(ok ? "✓ הרשימה הועתקה ללוח" : "ההעתקה נכשלה – סמנו את הטקסט והעתיקו ידנית");
              }}><Copy />העתק</Button>
              <Button type="button" className="h-11 flex-1" onClick={async () => {
                if (!msg.startsWith("✓")) await copyText(text);
                const u = p.active!.url;
                window.open(/^https?:\/\//.test(u) ? u : `https://${u}`, "_blank", "noopener");
              }}><ExternalLink />פתח את האתר</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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
