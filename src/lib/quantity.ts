// פענוח כמויות ויחידות מטקסט או מדיבור: "3 ק״ג עגבניות", "חלב 2", "חצי קילו גבינה"

const NUMBER_WORDS: Record<string, number> = {
  חצי: 0.5, אחד: 1, אחת: 1, שניים: 2, שתיים: 2, שני: 2, שתי: 2, זוג: 2,
  שלוש: 3, שלושה: 3, ארבע: 4, ארבעה: 4, חמש: 5, חמישה: 5, שש: 6, שישה: 6,
  שבע: 7, שבעה: 7, שמונה: 8, תשע: 9, תשעה: 9, עשר: 10, עשרה: 10, תריסר: 12,
};

// כינוי -> יחידה תקנית
const UNIT_WORDS: Record<string, string> = {
  'ק"ג': "ק״ג", "ק״ג": "ק״ג", קג: "ק״ג", קילו: "ק״ג", קילוגרם: "ק״ג",
  גרם: "גרם", "גר'": "גרם", גר: "גרם",
  ליטר: "ליטר", ליטרים: "ליטר", "ל'": "ליטר",
  "מ\"ל": "מ״ל", "מ״ל": "מ״ל",
  יחידה: "יח׳", יחידות: "יח׳", "יח'": "יח׳", "יח׳": "יח׳",
  חבילה: "חבילה", חבילות: "חבילה", בקבוק: "בקבוק", בקבוקים: "בקבוק",
  קרטון: "קרטון", קרטונים: "קרטון", שקית: "שקית", שקיות: "שקית",
  פחית: "פחית", פחיות: "פחית",
};

export const UNITS = ["", "יח׳", "ק״ג", "גרם", "ליטר", "חבילה", "בקבוק", "קרטון"];

export type ParsedItem = { name: string; quantity: number; unit: string };

function toNumber(token: string): number | null {
  const n = Number(token.replace(",", "."));
  if (Number.isFinite(n) && n > 0 && /^\d/.test(token)) return n;
  return NUMBER_WORDS[token] ?? null;
}

// מנסה לקרוא [כמות] [יחידה] בתחילת המחרוזת או בסופה
function take(tokens: string[], fromEnd: boolean) {
  const t = fromEnd ? [...tokens].reverse() : [...tokens];
  let quantity: number | null = null;
  let unit = "";
  let used = 0;
  const q = t[0] ? toNumber(t[0]) : null;
  if (q !== null) {
    quantity = q;
    used = 1;
  }
  // בסוף: "עגבניות 2 קילו" -> הסדר הפוך (יחידה ואז מספר)
  const unitIdx = fromEnd ? 0 : used;
  const u = t[unitIdx] ? UNIT_WORDS[t[unitIdx]] : undefined;
  if (u) {
    unit = u;
    if (fromEnd) {
      const q2 = t[1] ? toNumber(t[1]) : null;
      quantity = q2 ?? 1;
      used = q2 !== null ? 2 : 1;
    } else {
      used += 1;
      quantity ??= 1;
    }
  }
  if (quantity === null) return null;
  const rest = fromEnd ? tokens.slice(0, tokens.length - used) : tokens.slice(used);
  if (!rest.length) return null;
  return { name: rest.join(" "), quantity, unit };
}

export function parseQuantity(input: string): ParsedItem {
  const clean = input.trim().replace(/\s+/g, " ");
  const tokens = clean.split(" ");
  if (tokens.length > 1) {
    const hit = take(tokens, false) ?? take(tokens, true);
    if (hit) return hit;
  }
  return { name: clean, quantity: 1, unit: "" };
}

export function formatQuantity(quantity: number, unit: string): string {
  if (quantity === 1 && !unit) return "";
  const q = quantity === 0.5 ? "½" : String(Number(quantity.toFixed(2)));
  return unit ? `${q} ${unit}` : `×${q}`;
}

// צעד לכפתורי +/- לפי היחידה
export function stepFor(unit: string): number {
  if (unit === "גרם" || unit === "מ״ל") return 100;
  if (unit === "ק״ג" || unit === "ליטר") return 0.5;
  return 1;
}
