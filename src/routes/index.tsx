import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AddScreen } from "@/components/shopping/AddScreen";
import { ListScreen } from "@/components/shopping/ListScreen";
import { useShoppingList } from "@/hooks/useShoppingList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "רשימת קניות חכמה — ניהול קניות פשוט בעברית" },
      {
        name: "description",
        content:
          "אפליקציית רשימת קניות בעברית: הוספה מהירה, סימון פריטים שהושלמו, עריכה ומחיקה. הרשימה נשמרת במכשיר שלכם.",
      },
      { property: "og:title", content: "רשימת קניות חכמה" },
      {
        property: "og:description",
        content: "הוסיפו פריטים בשנייה, סמנו מה שנקנה, והרשימה נשמרת אצלכם במכשיר.",
      },
    ],
  }),
  component: Index,
});

type Screen = "add" | "list" | "closed";

function Index() {
  const [screen, setScreen] = useState<Screen>("add");
  const list = useShoppingList();

  // "יציאה מאפליקציה" — סוגר את התצוגה ומאפס את המסך
  const exitApp = () => {
    setScreen("closed");
    if (typeof window !== "undefined") window.close();
  };

  return (
    <main className="min-h-screen bg-background">
      {screen === "add" && (
        <AddScreen
          count={list.items.length}
          onAdd={list.addItem}
          onGoShopping={() => setScreen("list")}
          onExit={exitApp}
        />
      )}

      {screen === "list" && (
        <ListScreen
          items={list.items}
          onToggle={list.toggleItem}
          onRename={list.renameItem}
          onRemove={list.removeItem}
          onBack={() => setScreen("add")}
        />
      )}

      {screen === "closed" && (
        <div className="animate-in fade-in flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center duration-300">
          <h1 className="text-2xl font-black text-foreground">להתראות! 👋</h1>
          <p className="text-muted-foreground">הרשימה שלכם נשמרה במכשיר.</p>
          <button
            type="button"
            onClick={() => setScreen("add")}
            className="rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:brightness-110 active:scale-95"
          >
            חזרה לאפליקציה
          </button>
        </div>
      )}
    </main>
  );
}
