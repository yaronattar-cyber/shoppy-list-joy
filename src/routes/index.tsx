import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, ListChecks, Package, Users, ShoppingBag } from "lucide-react";
import { OnlineWishlist } from "@/components/shopping/OnlineWishlist";
import { useOnlineWishlist } from "@/hooks/useOnlineWishlist";
import { toast } from "sonner";
import type { AddTarget } from "@/components/shopping/TargetPicker";
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
import { useStores } from "@/hooks/useStores";
import { useOnlineOrders } from "@/hooks/useOnlineOrders";
import { StoreChips } from "@/components/shopping/StoreChips";
import { StoreSelector } from "@/components/shopping/StoreSelector";
import { EventBar } from "@/components/shopping/EventBar";
import { useEvents } from "@/hooks/useEvents";
import { MembersContext, useFamilyMembers } from "@/hooks/useFamilyMembers";
import { requestBadgePermission, useAppBadge } from "@/hooks/useAppBadge";

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
  const wish = useOnlineWishlist();
  const [listTab, setListTab] = useState<"shopping" | "online">("shopping");
  const [screen, setScreen] = useState<Screen>("home");
  const [restored, setRestored] = useState(false);
  const [startScreen, setStartScreen] = useState<Screen>("home");
  const chooseStart = (next: Screen) => {
    localStorage.setItem("start-screen", next);
    setStartScreen(next);
    toast.success("מסך הפתיחה עודכן");
  };
  // שחזור המסך הפעיל אם הדפדפן רוענן (למשל אחרי פתיחת המצלמה)
  useEffect(() => {
    // רענון באמצע שימוש משחזר את המסך; פתיחה חדשה — מסך הפתיחה שנבחר
    const saved = sessionStorage.getItem("active-screen") as Screen | null;
    const start = localStorage.getItem("start-screen") as Screen | null;
    setStartScreen(start ?? "home");
    if (saved) setScreen(saved);
    else if (start) setScreen(start);
    setRestored(true);
  }, []);
  useEffect(() => { sessionStorage.setItem("active-screen", screen); }, [screen]);
  const family = useFamily();
  const stores = useStores(family.familyId);
  const list = useShoppingList(family.familyId, family.userName ?? undefined, stores.activeId);
  const onlineOrders = useOnlineOrders(family.familyId, stores.active?.isOnlineOnly ? stores.active.id : null);
  const pendingOrders = useOnlineOrders(family.familyId, "*");
  const events = useEvents(family.familyId);
  // רשימת אירוע משותפת פועלת כרשימה עצמאית עם קוד משלה
  const eventList = useShoppingList(events.activeId, family.userName ?? undefined, null);
  const shown = events.active ? eventList : list;
  const fam = useFamilyMembers(family.familyId, family.userName);
  const roleMap = Object.fromEntries(fam.members.map((m) => [m.name, m.role]));
  const badgeItems = useMemo(
    () => [...list.allActive, ...list.inventory, ...eventList.allActive],
    [list.allActive, list.inventory, eventList.allActive],
  );
  useAppBadge(badgeItems, family.userName);
  useEffect(() => {
    const ask = () => requestBadgePermission();
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, []);
  // מוצר שממתין להוספה לאירוע שעדיין נטען
  const [pendingEvent, setPendingEvent] = useState<{ id: string; names: string[] } | null>(null);
  useEffect(() => {
    if (pendingEvent && events.activeId === pendingEvent.id) {
      pendingEvent.names.forEach((n) => eventList.addItem(n));
      setPendingEvent(null);
    }
  }, [pendingEvent, events.activeId, eventList]);
  const targets: AddTarget[] = [
    ...stores.stores.map((st) => ({ id: st.id, label: st.name, kind: "store" as const })),
    ...events.events.map((ev) => ({ id: ev.id, label: ev.name, kind: "event" as const })),
  ];
  targets.push({ id: null, label: "כללי (ללא שיוך לחנות)", kind: "store" });
  const addTo = (name: string, t: AddTarget) => {
    if (t.kind === "store") {
      const r = list.addItem(name, t.id);
      if (r) toast.success(`${r} נוסף ל${t.label}`);
      return r;
    }
    if (!t.id) return null;
    toast.success(`${name} נוסף ל${t.label}`);
    if (events.activeId === t.id) return eventList.addItem(name);
    events.select(t.id);
    setPendingEvent({ id: t.id, names: [name] });
    return name;
  };
  // רשימה ייעודית לרכיבים חסרים של מנה שזוהתה בתמונה
  const createRecipeList = async (dish: string, names: string[]) => {
    const id = await events.create(`רכיבים ל-${dish}`);
    if (!id) return;
    setPendingEvent({ id, names });
    toast.success(`נוצרה רשימה „רכיבים ל-${dish}”`);
    setScreen("list");
  };
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

  // מסך הבית תמיד מוסיף לסופר הבית
  const { resetToDefault } = stores;
  useEffect(() => {
    if (restored && screen === "home") resetToDefault();
  }, [restored, screen, resetToDefault]);

  useEffect(() => {
    if (family.joinedFromLink) setScreen("family");
  }, [family.joinedFromLink]);


  if (!family.ready || !family.familyId)
    return (
      <main className="min-h-screen bg-background p-4 space-y-3" aria-busy="true">
        <div className="h-8 w-40 rounded-md bg-muted animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </main>
    );

  if (!family.userName) {
    return (
      <main className="min-h-screen bg-background">
        <Onboarding onSave={family.chooseName} />
      </main>
    );
  }

  return (
    <MembersContext.Provider value={roleMap}>
    <main className="min-h-screen bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
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

      {screen === "list" && (
        <div role="tablist" aria-label="סוג רשימת קניות" className="mx-auto flex max-w-2xl gap-2 px-3 pt-3 sm:px-6">
          <Button role="tab" aria-selected={listTab === "shopping"} variant={listTab === "shopping" ? "default" : "ghost"} size="sm" onClick={() => setListTab("shopping")}><ListChecks className="h-4 w-4" />רשימת קניות</Button>
          <Button role="tab" aria-selected={listTab === "online"} variant={listTab === "online" ? "default" : "ghost"} size="sm" onClick={() => setListTab("online")}><ShoppingBag className="h-4 w-4" />קניות אונליין ({wish.items.length})</Button>
        </div>
      )}
      {screen === "list" && listTab === "online" && (
        <div role="tabpanel" aria-label="קניות אונליין" className="mx-auto max-w-2xl px-3 pb-8 sm:px-6">
          <OnlineWishlist embedded items={wish.items} onToggle={wish.toggle} onRename={wish.rename} onRemove={wish.remove} onRemoveStore={wish.removeStore} />
        </div>
      )}
      {screen === "list" && listTab === "shopping" && events.active && (
        <EventBar
          familyId={family.familyId}
          userName={family.userName}
          active={events.active}
          joinedName={events.joinedName}
          onClearJoined={events.clearJoined}
          onClose={(ev) => void events.close(ev)}
        />
      )}
      {screen === "list" && listTab === "shopping" && (
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
          chips={
        <StoreChips
          stores={stores.stores}
          activeId={stores.activeId}
          items={list.allActive}
          onSelect={(id) => { events.select(null); stores.select(id); }}
          events={events.events}
          activeEventId={events.activeId}
          onSelectEvent={events.select}
        />
          }
        />
      )}
      {screen === "home" && (
        <AddScreen
          wish={wish}
          userName={family.userName}
          count={list.items.length}
          items={list.items}
          onToggle={list.toggleItem}
          history={list.history}
          productHistory={list.productHistory}
          targets={targets}
          onAddTo={addTo}
          inventory={list.inventory}
          onCreateRecipeList={(d, n) => void createRecipeList(d, n)}
           onGoShopping={() => { setListTab("shopping"); setScreen("list"); }}
          onOpenFamily={() => setScreen("family")}
          onSpeak={(text) => speak(text)}
        />
      )}
      {screen === "list" && listTab === "shopping" && (
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
          activeStore={events.active ? null : stores.active}
          onlineOrders={events.active ? [] : onlineOrders.orders}
          onlineOrderWorking={onlineOrders.working}
          onOnlineOrderPlaced={async () => {
            const created = await onlineOrders.createOrder();
            if (created) { await list.refresh(); void pendingOrders.refresh().catch(() => {}); }
            return created;
          }}
          onOnlineOrderReceived={async (orderId) => {
            const count = await onlineOrders.receiveOrder(orderId);
            if (count) await list.refresh();
            return count;
          }}
          stores={events.active ? [] : stores.stores}
          targets={targets}
          onAddTo={addTo}
          isGeneral={!events.active && !stores.active}
        />
      )}
      {screen === "inventory" && (
        <InventoryScreen
          items={list.inventory}
          onRestore={(ids) => void list.restoreFromInventory(ids)}
          onDelete={(ids) => void list.deleteFromInventory(ids)}
          onAddPreparedMeal={list.addPreparedMeal}
          onAddToInventory={list.addToInventory}
          onUpdate={list.updateInventory}
          orders={pendingOrders.orders}
          storeNames={Object.fromEntries(stores.stores.map((st) => [st.id, st.name]))}
          orderWorking={pendingOrders.working}
          onOrderReceived={async (orderId) => { const count = await pendingOrders.receiveOrder(orderId); if (count) await list.refresh(); return count; }}
          onAddMissing={(names) => { const home = stores.stores.find((x) => x.is_default)?.id ?? null; names.forEach((n) => list.addItem(n, home)); }}
          onlineBought={wish.ordered}
          onOnlineDelivered={wish.remove}
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
          members={fam.members}
          onSetRole={(n, r) => void fam.setRole(n, r)}
          startScreen={startScreen}
          onSetStart={(v) => chooseStart(v as Screen)}
        />
      )}
    </main>
    </MembersContext.Provider>
  );
}
