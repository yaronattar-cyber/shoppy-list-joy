import { Milk, Croissant, Egg, Carrot, CircleDashed, type LucideIcon } from "lucide-react";

// הגדרת הקטגוריות במקום אחד — קל להוסיף/לשנות בעתיד
export type Category = {
  id: string;
  label: string; // עבור aria-label / tooltip
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
    options: ["עגבניות", "מלפפונים", "בצל", "גזר", "חסה", "פלפל"],
    allowCustom: true,
    customPlaceholder: "ירק אחר...",
  },
];
