import { createFileRoute } from "@tanstack/react-router";
import { ShoppingApp } from "@/components/shopping/ShoppingApp";

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
  component: ShoppingApp,
});

