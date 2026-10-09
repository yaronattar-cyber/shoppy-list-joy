import { useState } from "react";
import { ArrowRight, ExternalLink, Globe2, Pencil, Plus, Star, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { BasketLine } from "@/lib/prices";
import type { StoreInfo } from "@/hooks/useStores";
import type { EventList } from "@/hooks/useEvents";

type Props = {
  stores: StoreInfo[];
  active: StoreInfo | null;
  lines: BasketLine[];
  onSelect: (id: string | null) => void;
  onSave: (s: { id?: string; name: string; url: string; is_default?: boolean; isOnlineOnly?: boolean }) => Promise<string | undefined>;
  onRemove: (id: string) => void;
  onAdd?: (name: string) => void;
  events?: EventList[];
  activeEvent?: EventList | null;
  onSelectEvent?: (id: string | null) => void;
  onCreateEvent?: (name: string) => Promise<string | null>;
  shortcutIds: string[];
  shortcutsReady: boolean;
  onPinShortcut: (id: string, pinned: boolean) => void;
  chips?: React.ReactNode;
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
  const [editing, setEditing] = useState<{ id?: string; name: string; url: string; is_default?: boolean; isOnlineOnly?: boolean } | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventName, setEventName] = useState("");
  const [pinned, setPinned] = useState(false);
  const [eventPinned, setEventPinned] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const pinLabel = "הוסף לשורת הקיצורים המהירים במסך הבית";
  const saveStore = async () => {
    if (!editing?.name.trim()) return;
    const id = await p.onSave(editing);
    if (id && p.shortcutsReady) p.onPinShortcut(id, pinned);
    setEditing(null);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-1 sm:px-6">
      {/* בורר אחד: צ'יפים + כפתור "+" ליצירת חנות/אירוע */}
      <div className="-mx-4 flex items-center gap-1 pb-1 sm:-mx-6">
        <div className="min-w-0 flex-1">{p.chips}</div>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="ml-4 h-9 w-9 shrink-0 rounded-full sm:ml-6" aria-label="הוספת חנות או אירוע"><Plus /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-right">
            <DropdownMenuItem onSelect={() => { setPinned(false); setEditing({ name: "", url: "" }); }}><Store />הוספת חנות</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setEventPinned(false); setCreatingEvent(true); }}><Plus />אירוע חדש</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {creatingEvent && (
        <form className="mb-2 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (eventName.trim()) { const id = await p.onCreateEvent?.(eventName); if (!id) return; if (p.shortcutsReady) p.onPinShortcut(id, eventPinned); setEventName(""); setCreatingEvent(false); } }}>
          <input autoFocus value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="שם האירוע (למשל: על האש שבת)" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" size="sm" disabled={!eventName.trim()}>צור</Button>
          <Button type="button" variant="ghost" size="icon" aria-label="ביטול" onClick={() => setCreatingEvent(false)}>✕</Button>
           <label className="flex w-full items-center gap-2 text-sm"><input type="checkbox" checked={eventPinned} disabled={!p.shortcutsReady} onChange={(e) => setEventPinned(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />{pinLabel}</label>
        </form>
      )}

      {p.activeEvent && <Button type="button" variant="ghost" size="sm" className="mb-2 text-primary" aria-label="עריכת קיצור האירוע" onClick={() => { setEventPinned(p.shortcutIds.includes(p.activeEvent?.id ?? "")); setEditingEvent(true); }}><Pencil className="h-4 w-4" />עריכת קיצור האירוע</Button>}
      <Drawer open={editingEvent} onOpenChange={setEditingEvent}>
        <DrawerContent dir="rtl">
          <DrawerHeader className="text-right"><DrawerTitle>{p.activeEvent?.name}</DrawerTitle><DrawerDescription>קיצור אישי במסך הבית</DrawerDescription></DrawerHeader>
          <form className="space-y-4 px-4 pb-6" onSubmit={(e) => { e.preventDefault(); if (p.activeEvent && p.shortcutsReady) p.onPinShortcut(p.activeEvent.id, eventPinned); setEditingEvent(false); }}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eventPinned} disabled={!p.shortcutsReady} onChange={(e) => setEventPinned(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />{pinLabel}</label>
            <Button type="submit" disabled={!p.shortcutsReady}>שמירה</Button>
          </form>
        </DrawerContent>
      </Drawer>

      {/* כרטיס החנות מוצג רק כשאין אירוע פעיל */}
      {!p.activeEvent && (
        <>
          {/* כרטיס חנות פעילה: שורה אחת — אייקון ושם בצד אחד, קישור ועט עריכה בצד השני */}
          <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-store-header px-3 shadow-soft">
            <Store className="h-4 w-4 shrink-0 text-primary" />
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
              <span className="truncate">{p.active?.name ?? "רשימה כללית"}</span>
              {p.active?.isOnlineOnly && <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"><Globe2 className="h-3 w-3" />אונליין</span>}
            </p>
            <span className="ms-auto flex shrink-0 items-center gap-1">
              {p.active?.url ? (
                <a href={p.active.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary" dir="ltr">
                  {host(p.active.url)}<ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                p.active && <span className="text-xs text-muted-foreground">ללא אתר</span>
              )}
              {p.active && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="עריכת חנות" onClick={() => { if (p.active) { setPinned(p.shortcutIds.includes(p.active.id)); setEditing({ ...p.active }); } }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </span>
          </div>
        </>
      )}


      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent dir="rtl">
          {/* מיכל גלילה: מגביל את הגובה ומאפשר לגלול כדי שהכפתורים למטה יישארו נגישים גם כשהמקלדת פתוחה */}
          <div className="max-h-[80dvh] overflow-y-auto overscroll-contain">
            <DrawerHeader className="text-right">
              <DrawerTitle>{editing?.id ? "עריכת חנות" : "חנות חדשה"}</DrawerTitle>
              <DrawerDescription>לכל חנות רשימה משלה. כתובת האתר תוצג בכרטיס החנות.</DrawerDescription>
            </DrawerHeader>
            {editing && (
              <form
                className="space-y-3 px-4 pb-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.name.trim()) return;
                void saveStore();
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
              <label className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium">
                <input type="checkbox" checked={!!editing.isOnlineOnly} onChange={(e) => setEditing({ ...editing, isOnlineOnly: e.target.checked })} className="h-5 w-5 accent-[var(--color-primary)]" />
                <Globe2 className="h-4 w-4 text-primary" />חנות אונליין בלבד
              </label>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="h-11" onClick={() => { if (editing.name.trim()) void saveStore(); else setEditing(null); }}>
                  <ArrowRight />חזרה
                </Button>
                <Button type="submit" className="h-11 flex-1">שמירה</Button>
                {editing.id && (
                  <Button type="button" variant="outline" className="h-11 text-destructive" onClick={() => { if (editing.id) p.onRemove(editing.id); setEditing(null); }}>
                    <Trash2 />מחיקה
                  </Button>
                )}
              </div>
              <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={pinned} disabled={!p.shortcutsReady} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />{pinLabel}</label>
            </form>
          )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
