import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Home, ListChecks, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddScreen } from "@/components/shopping/AddScreen";
import { ListScreen } from "@/components/shopping/ListScreen";
import { InventoryScreen } from "@/components/shopping/InventoryScreen";
import { FamilyScreen } from "@/components/shopping/FamilyScreen";
import { MergeFamilyDialog } from "@/components/shopping/MergeFamilyDialog";
import { Onboarding } from "@/components/shopping/Onboarding";
import { useFamily } from "@/hooks/useFamily";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useSpeech } from "@/hooks/useSpeech";
import { useSwipe } from "@/hooks/useSwipe";
import { useStores } from "@/hooks/useStores";
import { StoreSelector } from "@/components/shopping/StoreSelector";
import { EventBar } from "@/components/shopping/EventBar";
import { useEvents } from "@/hooks/useEvents";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "רשימת קניות חכמה — רשימה משפחתית משותפת" },
      {
        name: "description",
        content:
          "רשימת קניות משפחתית בעברית: הוספה בדיבור, סנכרון בין מכשירים, השוואת מחירי סל בין רשתות והזמנה בוואטסאפ.",
      },
      { property: "og:title", content: "רשימת קניות חכמה למשפחה" },
      {
        property: "og:description",
        content: "רשימה משותפת לכל המשפחה, עם דיבור, סנכרון בזמן אמת והסל הזול ביותר.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

// סדר המסכים — משמש להחלקה
const ORDER = ["home", "list", "inventory"] as const;
type Screen = (typeof ORDER)[number] | "family";

function Index() {
  const [screen, setScreen] = useState<Screen>("home");
  const [restored, setRestored] = useState(false);
  // שחזור המסך הפעיל אם הדפדפן רוענן (למשל אחרי פתיחת המצלמה)
  useEffect(() => {
    const saved = sessionStorage.getItem("active-screen") as Screen | null;
    if (saved && saved !== "home") setScreen(saved);
    setRestored(true);
  }, []);
  useEffect(() => { sessionStorage.setItem("active-screen", screen); }, [screen]);
  const family = useFamily();
  const stores = useStores(family.familyId);
  const list = useShoppingList(family.familyId, family.userName ?? undefined, stores.activeId);
  const events = useEvents(family.familyId);
  // רשימת אירוע משותפת פועלת כרשימה עצמאית עם קוד משלה
  const eventList = useShoppingList(events.activeId, family.userName ?? undefined, null);
  const shown = events.active ? eventList : list;
  useEffect(() => {
    if (events.joinedName) setScreen("list");
  }, [events.joinedName]);
  const { speak } = useSpeech();
  const { clearPrevious } = family;
  const { refresh } = list;
  const onMergeDone = useCallback(
    (merged: boolean) => {
      clearPrevious();
      if (merged) void refresh();
    },
    [clearPrevious, refresh],
  );

  // RTL: החלקה שמאלה = המסך הבא
  const step = (dir: 1 | -1) => {
    const i = ORDER.indexOf(screen as (typeof ORDER)[number]);
    const next = ORDER[i === -1 ? 0 : Math.min(ORDER.length - 1, Math.max(0, i + dir))];
    if (next) setScreen(next);
  };
  const swipe = useSwipe({ onLeft: () => step(1), onRight: () => step(-1) });

  // מסך הבית תמיד מוסיף לסופר הבית
  const { resetToDefault } = stores;
  useEffect(() => {
    if (restored && screen === "home") resetToDefault();
  }, [restored, screen, resetToDefault]);

  useEffect(() => {
    if (family.joinedFromLink) setScreen("family");
  }, [family.joinedFromLink]);


  if (!family.ready || !family.familyId) return <main className="min-h-screen bg-background" />;

  if (!family.userName) {
    return (
      <main className="min-h-screen bg-background">
        <Onboarding onSave={family.chooseName} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))]" {...swipe}>
      {family.previousFamilyId && (
        <MergeFamilyDialog from={family.previousFamilyId} to={family.familyId} onDone={onMergeDone} />
      )}
      {(!list.online || list.pendingCount > 0) && (
        <div
          role="status"
          className="sticky top-0 z-50 border-b border-border bg-muted px-4 py-1.5 text-center text-xs text-muted-foreground"
        >
          {!list.online
            ? `מצב לא מקוון — השינויים נשמרים במכשיר${list.pendingCount ? ` (${list.pendingCount} ממתינים)` : ""}`
            : list.syncing
              ? "מסנכרן שינויים..."
              : `${list.pendingCount} שינויים ממתינים לסנכרון`}
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)] backdrop-blur">
        <div className="mx-auto grid h-[4.5rem] max-w-xl grid-cols-4 px-2">
        {(
          [
            ["home", "בית", Home],
            ["list", "רשימה", ListChecks],
            ["inventory", "מלאי", Package],
            ["family", "משפחה", Users],
          ] as const
        ).map(([id, label, Icon]) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            onClick={() => setScreen(id)}
            aria-current={screen === id ? "page" : undefined}
            className={`h-full flex-col gap-1 rounded-none px-1 text-xs font-medium ${
              screen === id ? "text-primary hover:bg-accent hover:text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={screen === id ? 2.5 : 2} />
            {label}
          </Button>
        ))}
        </div>
      </nav>

      {screen === "list" && (events.active || events.joinedName) && events.active && (
        <EventBar
          familyId={family.familyId}
          userName={family.userName}
          active={events.active}
          joinedName={events.joinedName}
          onClearJoined={events.clearJoined}
          onClose={(ev) => void events.close(ev)}
        />
      )}
      {screen === "list" && (
        <StoreSelector
          stores={stores.stores}
          active={stores.active}
          lines={list.items}
          onSelect={stores.select}
          onSave={(st) => void stores.save(st)}
          onRemove={(id) => void stores.remove(id)}
          events={events.events}
          activeEvent={events.active}
          onSelectEvent={events.select}
          onCreateEvent={(n) => void events.create(n)}
        />
      )}
      {screen === "home" && (
        <AddScreen
          userName={family.userName}
          count={list.items.length}
          items={list.items}
          onToggle={list.toggleItem}
          history={list.history}
          productHistory={list.productHistory}
          onAdd={list.addItem}
          onGoShopping={() => setScreen("list")}
          onOpenFamily={() => setScreen("family")}
          onSpeak={(text) => speak(text)}
        />
      )}
      {screen === "list" && (
        <ListScreen
          items={shown.items}
          history={list.history}
          productHistory={list.productHistory}
          onOutOfStock={shown.markOutOfStock}
          onAdd={shown.addItem}
          onAddMany={shown.addMany}
          onToggle={shown.toggleItem}
          onUpdate={shown.updateDetails}
          onRemove={(id) => void shown.removeItem(id)}
          onMarkAll={(c) => void shown.markAll(c)}
          onArchive={() => void shown.archiveCompleted()}
          storeName={events.active ? events.active.name : stores.active?.name}
          stores={events.active ? [] : stores.stores}
        />
      )}
      {screen === "inventory" && (
        <InventoryScreen
          items={list.inventory}
          onRestore={(ids) => void list.restoreFromInventory(ids)}
          onDelete={(ids) => void list.deleteFromInventory(ids)}
          onAddPreparedMeal={list.addPreparedMeal}
        />
      )}
      {screen === "family" && (
        <FamilyScreen
          familyId={family.familyId}
          userName={family.userName}
          joinedFromLink={family.joinedFromLink}
          onRename={family.chooseName}
          onJoin={family.joinFamily}
          onCreate={family.createFamily}
          onBack={() => setScreen("home")}
        />
      )}
    </main>
  );
}
