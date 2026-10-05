import { useEffect, useState } from "react";
// קטגוריות מטבח למסך המלאי — סיווג לפי קטגוריה שמורה או לפי מילות מפתח בשם
export type InvCategory = { id: string; label: string; emoji: string; words: string[] };

export const INV_CATEGORIES: InvCategory[] = [
  { id: "prepared-meal", label: "מנות מוכנות", emoji: "🍲", words: ["מנה", "מנות", "מרק", "לזניה", "קציצות", "תבשיל", "פשטידה", "שניצל"] },
  { id: "dairy", label: "מוצרי חלב וביצים", emoji: "🧀", words: ["חלב", "גבינ", "יוגורט", "קוטג", "שמנת", "חמאה", "ביצ", "לבן", "מעדן", "אשל", "צפתית", "בולגרית"] },
  { id: "produce", label: "ירקות ופירות", emoji: "🥦", words: ["ירק", "עגבני", "מלפפון", "בצל", "שום", "תפוח", "בננ", "גזר", "חסה", "פלפל", "לימון", "תפוז", "אבוקדו", "פרי", "פירות", "תות", "ענב", "כרוב", "קישוא", "חציל", "בטטה", "פטרוזיליה", "כוסברה", "שמיר"] },
  { id: "meat", label: "בשר, עוף ודגים", emoji: "🥩", words: ["בשר", "עוף", "חזה", "כרעיים", "דג", "סלמון", "טונה", "נקניק", "המבורגר", "פרגית", "טחון", "הודו"] },
  { id: "vegetarian", label: "צמחוני/טבעוני", emoji: "🌱", words: ["צמחוני", "טבעוני", "טופו", "סויה", "שקדים", "שיבולת שועל"] },
  { id: "bakery", label: "לחם ומאפים", emoji: "🍞", words: ["לחם", "חלה", "פית", "בגט", "לחמני", "עוגה", "קרואסון", "טורטיה"] },
  { id: "canned", label: "שימורים/מזווה", emoji: "🥫", words: ["שימורים", "שימור", "מזווה", "חמוצים", "זיתים", "תירס"] },
  { id: "pantry", label: "מזווה, דגנים ופסטה", emoji: "🌾", words: ["אורז", "פסטה", "קמח", "סוכר", "קוסקוס", "עדשים", "שעועית", "חומוס", "פתיתים", "קורנפלקס", "שיבולת", "קטניות", "שימור"] },
  { id: "oils", label: "שמנים, רטבים וממרחים", emoji: "🫒", words: ["שמן", "רוטב", "קטשופ", "מיונז", "חרדל", "טחינה", "דבש", "ריבה", "שוקולד למריחה", "ממרח", "חומץ"] },
  { id: "spices", label: "תבלינים ואפייה", emoji: "🧂", words: ["מלח", "פפריקה", "כמון", "תבלין", "אבקת", "שמרים", "וניל", "קינמון", "כורכום"] },
  { id: "frozen", label: "קפואים", emoji: "🧊", words: ["קפוא", "גלידה", "פיצה", "אפונה", "בורקס"] },
  { id: "drinks", label: "משקאות", emoji: "🧃", words: ["מים", "מיץ", "קולה", "סודה", "בירה", "יין", "קפה", "תה", "משקה"] },
  { id: "snacks", label: "חטיפים ומתוקים", emoji: "🍫", words: ["חטיף", "במבה", "ביסלי", "שוקולד", "עוגיות", "ופל", "סוכריות", "צ'יפס", "קרקר"] },
  { id: "cleaning", label: "ניקיון וטואלטיקה", emoji: "🧴", words: ["סבון", "שמפו", "נייר", "אקונומיקה", "ניקוי", "כביסה", "מגבונ", "משחת", "טישו"] },
  { id: "other", label: "אחר", emoji: "📦", words: [] },
];

const BY_ID = new Map(INV_CATEGORIES.map((c) => [c.id, c]));

export function inventoryCategoryOf(name: string, stored: string): string {
  if (BY_ID.has(stored) || (stored.startsWith("custom-") && loadCustomCategories().some((c) => c.id === stored))) return stored;
  const n = name.toLowerCase();
  for (const c of INV_CATEGORIES) if (c.words.some((w) => n.includes(w))) return c.id;
  return "other";
}

export const STOCK_STATUS = [
  { id: "full", label: "מלא", dot: "bg-primary" },
  { id: "half", label: "חצי מלא", dot: "bg-amber-500" },
  { id: "low", label: "כמעט נגמר", dot: "bg-destructive" },
] as const;

// קטגוריות מותאמות אישית — נשמרות ב-localStorage ומסונכרנות בין רכיבים
const CUSTOM_KEY = "custom-inv-categories";
const CUSTOM_EVENT = "custom-inv-categories-change";

export function loadCustomCategories(): InvCategory[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as InvCategory[]; } catch { return []; }
}

export function addCustomCategory(label: string, emoji: string): InvCategory | null {
  const clean = label.trim();
  if (!clean) return null;
  const list = loadCustomCategories();
  const existing = [...INV_CATEGORIES, ...list].find((c) => c.label === clean);
  if (existing) return existing;
  const cat: InvCategory = { id: `custom-${Date.now().toString(36)}`, label: clean, emoji: emoji || "🏷️", words: [] };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify([...list, cat]));
  window.dispatchEvent(new Event(CUSTOM_EVENT));
  return cat;
}

// כל הקטגוריות (מובנות + מותאמות), "אחר" תמיד בסוף
export function allInvCategories(): InvCategory[] {
  const other = INV_CATEGORIES.filter((c) => c.id === "other");
  return [...INV_CATEGORIES.filter((c) => c.id !== "other"), ...loadCustomCategories(), ...other];
}

export function useInvCategories(): InvCategory[] {
  const [cats, setCats] = useState<InvCategory[]>(INV_CATEGORIES);
  useEffect(() => {
    const sync = () => setCats(allInvCategories());
    sync();
    window.addEventListener(CUSTOM_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(CUSTOM_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return cats;
}
