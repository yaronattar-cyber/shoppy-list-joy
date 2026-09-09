import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AddScreen } from "@/components/shopping/AddScreen";
import { ListScreen } from "@/components/shopping/ListScreen";
import { Onboarding } from "@/components/shopping/Onboarding";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useSpeech } from "@/hooks/useSpeech";
import { loadUserName, saveUserName } from "@/lib/user-name";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "רשימת קניות חכמה — ניהול קניות פשוט בעברית" },
      {
        name: "description",
        content:
          "אפליקציית רשימת קניות בעברית: הוספה מהירה בקטגוריות, הוספה בדיבור, סימון פריטים שהושלמו, עריכה ומחיקה. הרשימה נשמרת במכשיר שלכם.",
      },
      { property: "og:title", content: "רשימת קניות חכמה" },
      {
        property: "og:description",
        content: "הוסיפו פריטים בדיבור או בלחיצה, סמנו מה שנקנה, והרשימה נשמרת אצלכם במכשיר.",
      },
    ],
  }),
  component: Index,
});

type Screen = "add" | "list" | "closed";

function Index() {
  const [screen, setScreen] = useState<Screen>("add");
  const [userName, setUserName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const list = useShoppingList(userName ?? undefined);
  const { speak } = useSpeech();

  // טעינת שם המשתמש אחרי הרכבה (onboarding מוצג רק אם אין שם)
  useEffect(() => {
    setUserName(loadUserName());
    setReady(true);
  }, []);

  // הקראת הכותרת האישית בכניסה למסך הראשי — פעם אחת
  useEffect(() => {
    if (!userName || screen !== "add") return;
    const id = setTimeout(
      () => speak(`שלום ${userName}, מה חסר לך היום?`, { once: true }),
      400,
    );
    return () => clearTimeout(id);
  }, [userName, screen, speak]);

  const exitApp = () => {
    setScreen("closed");
    if (typeof window !== "undefined") window.close();
  };

  if (!ready) return <main className="min-h-screen bg-background" />;

  if (!userName) {
    return (
      <main className="min-h-screen bg-background">
        <Onboarding
          onSave={(name) => {
            saveUserName(name);
            setUserName(name);
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {screen === "add" && (
        <AddScreen
          userName={userName}
          count={list.items.length}
          onAdd={list.addItem}
          onGoShopping={() => setScreen("list")}
          onExit={exitApp}
          onSpeak={(text) => speak(text)}
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
