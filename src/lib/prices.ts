// מנוע השוואת מחירים — שכבת נתונים פנימית עם הערכות מחיר.
// ניתן להחליף בעתיד ב-API אמיתי של הרשתות ללא שינוי בתצוגה.

export const STORES = ["רמי לוי", "שופרסל", "יוחננוף", "ויקטורי"] as const;
export type Store = (typeof STORES)[number];

// מקדם מחיר יחסי לכל רשת (הערכה)
const STORE_FACTOR: Record<Store, number> = {
  "רמי לוי": 0.9,
  שופרסל: 1.12,
  יוחננוף: 1.0,
  ויקטורי: 1.05,
};

// מחירי בסיס משוערים לפי מילת מפתח בשם הפריט (₪)
const BASE_PRICES: Array<{ match: string; price: number }> = [
  { match: "חלב", price: 7.2 },
  { match: "סויה", price: 9.5 },
  { match: "שיבולת", price: 11.9 },
  { match: "לחם", price: 8.5 },
  { match: "חלה", price: 12 },
  { match: "פיתות", price: 9 },
  { match: "בגט", price: 7 },
  { match: "ביצים", price: 14.9 },
  { match: "גבינה", price: 12.5 },
  { match: "קוטג", price: 6.9 },
  { match: "מוצרלה", price: 16 },
  { match: "בולגרית", price: 13.5 },
  { match: "עגבניות", price: 6.5 },
  { match: "מלפפונים", price: 5.9 },
  { match: "בצל", price: 4.5 },
  { match: "גזר", price: 5 },
  { match: "חסה", price: 6 },
  { match: "פלפל", price: 9.9 },
  { match: "תפוחי אדמה", price: 5.5 },
  { match: "אורז", price: 11 },
  { match: "פסטה", price: 6.5 },
  { match: "קפה", price: 24.9 },
  { match: "סוכר", price: 5.5 },
  { match: "שמן זית", price: 34.9 },
  { match: "נייר טואלט", price: 27.9 },
];

const DEFAULT_PRICE = 10;

export function basePrice(itemName: string): number {
  const name = itemName.trim();
  const hit = BASE_PRICES.find((entry) => name.includes(entry.match));
  return hit ? hit.price : DEFAULT_PRICE;
}

export function priceAt(itemName: string, store: Store): number {
  return Math.round(basePrice(itemName) * STORE_FACTOR[store] * 10) / 10;
}

export type BasketTotal = { store: Store; total: number };

export const STORE_DISTANCES: Record<Store, number> = {
  "רמי לוי": 850,
  שופרסל: 150,
  יוחננוף: 1200,
  ויקטורי: 600,
};

export function basketTotals(itemNames: string[]): BasketTotal[] {
  return STORES.map((store) => ({
    store,
    total:
      Math.round(itemNames.reduce((sum, name) => sum + priceAt(name, store), 0) * 10) / 10,
  })).sort((a, b) => a.total - b.total);
}

export function formatPrice(value: number): string {
  return value.toFixed(2);
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} מ׳` : `${(meters / 1000).toFixed(1)} ק״מ`;
}
