import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddScreen } from "@/components/shopping/AddScreen";
import { ListScreen } from "@/components/shopping/ListScreen";
import { ShopScreen } from "@/components/shopping/ShopScreen";
import { FamilyScreen } from "@/components/shopping/FamilyScreen";
import { Onboarding } from "@/components/shopping/Onboarding";
import { useFamily } from "@/hooks/useFamily";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useSpeech } from "@/hooks/useSpeech";
import { useSwipe } from "@/hooks/useSwipe";

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
const ORDER = ["home", "list", "shop"] as const;
type Screen = (typeof ORDER)[number] | "family";

function Index() {
  const [screen, setScreen] = useState<Screen>("home");
  const family = useFamily();
  const list = useShoppingList(family.familyId, family.userName ?? undefined);
  const { speak } = useSpeech();

  // RTL: החלקה שמאלה = המסך הבא
  const step = (dir: 1 | -1) => {
    const i = ORDER.indexOf(screen as (typeof ORDER)[number]);
    const next = ORDER[i === -1 ? 0 : Math.min(ORDER.length - 1, Math.max(0, i + dir))];
    if (next) setScreen(next);
  };
  const swipe = useSwipe({ onLeft: () => step(1), onRight: () => step(-1) });

  useEffect(() => {
    if (family.joinedFromLink) setScreen("family");
  }, [family.joinedFromLink]);

  useEffect(() => {
    if (!family.userName || screen !== "home") return;
    const id = setTimeout(
      () => speak(`שלום ${family.userName}, מה חסר לך היום?`, { once: true }),
      400,
    );
    return () => clearTimeout(id);
  }, [family.userName, screen, speak]);

  if (!family.ready || !family.familyId) return <main className="min-h-screen bg-background" />;

  if (!family.userName) {
    return (
      <main className="min-h-screen bg-background">
        <Onboarding onSave={family.chooseName} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background" {...swipe}>
      <nav className="sticky top-0 z-40 flex justify-center gap-1 border-b-2 border-foreground bg-background/95 p-2 backdrop-blur">
        {(
          [
            ["home", "בית"],
            ["list", "רשימה"],
            ["shop", "קניות"],
            ["family", "משפחה"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScreen(id)}
            aria-current={screen === id ? "page" : undefined}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              screen === id ? "bg-foreground text-background" : "text-foreground hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {screen === "home" && (
        <AddScreen
          userName={family.userName}
          count={list.items.length}
          history={list.history}
          onAdd={list.addItem}
          onGoShopping={() => setScreen("list")}
          onOpenFamily={() => setScreen("family")}
          onSpeak={(text) => speak(text)}
        />
      )}
      {screen === "list" && (
        <ListScreen
          items={list.items}
          onAdd={list.addItem}
          onAddMany={list.addMany}
          onToggle={list.toggleItem}
          onRename={list.renameItem}
          onQuantity={list.setQuantity}
          onRemove={(id) => void list.removeItem(id)}
          onMarkAll={(c) => void list.markAll(c)}
          onArchive={() => void list.archiveCompleted()}
          onBack={() => setScreen("home")}
          onShop={() => setScreen("shop")}
        />
      )}
      {screen === "shop" && (
        <ShopScreen items={list.items} onToggle={list.toggleItem} onBack={() => setScreen("list")} />
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
