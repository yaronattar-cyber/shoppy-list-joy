import {
  Milk,
  Croissant,
  Egg,
  Carrot,
  CircleDashed,
  ShoppingBasket,
  type LucideIcon,
} from "lucide-react";

// מנוע השמות: שם משפחתי -> השם האמיתי שמופיע ברשימה
export const ALIASES: Record<string, string> = {
  "חלב ליאו": "חלב שיבולת כתום Alternative",
  "חלב אמא": "חלב Alternative משקה סויה כחול!",
  "חלב לכל העולם": "חלב 3%",
};

// תרגום שם לפי מנוע ה-aliasing (עם ניקוי רווחים)
export function resolveName(name: string): string {
  const clean = name.trim();
  return ALIASES[clean] ?? clean;
}

export type Category = {
  id: string;
  label: string;
  Icon: LucideIcon;
  direct?: boolean; // הוספה מיידית ללא תפריט
  options?: string[];
  allowCustom?: boolean;
  customPlaceholder?: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "milk",
    label: "חלב",
    Icon: Milk,
    options: ["חלב ליאו", "חלב אמא", "חלב לכל העולם"],
    allowCustom: true,
    customPlaceholder: "חלב אחר...",
  },
  {
    id: "bread",
    label: "לחם",
    Icon: Croissant,
    options: ["לחם אחיד", "לחם שיפון", "חלה", "פיתות", "בגט"],
    allowCustom: true,
    customPlaceholder: "לחם אחר...",
  },
  {
    id: "eggs",
    label: "ביצים",
    Icon: Egg,
    direct: true,
  },
  {
    id: "cheese",
    label: "גבינה",
    Icon: CircleDashed,
    options: ["גבינה לבנה", "גבינה צהובה", "קוטג'", "מוצרלה", "בולגרית"],
    allowCustom: true,
    customPlaceholder: "גבינה אחרת...",
  },
  {
    id: "vegetables",
    label: "ירקות",
    Icon: Carrot,
    options: ["עגבניות", "מלפפונים", "בצל", "גזר", "חסה", "פלפל", "תפוחי אדמה"],
    allowCustom: true,
    customPlaceholder: "ירק אחר...",
  },
  {
    id: "other",
    label: "אחר",
    Icon: ShoppingBasket,
    options: ["נייר טואלט", "שמן זית", "אורז", "פסטה", "קפה", "סוכר"],
    allowCustom: true,
    customPlaceholder: "פריט אחר...",
  },
];
