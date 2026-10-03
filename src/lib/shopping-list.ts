// שכבת נתונים לרשימת הקניות — טיפוסים ועזרי תצוגה משותפים.
// הנתונים עצמם נשמרים ב-Cloud כדי לאפשר סנכרון בין מכשירי המשפחה.

export type ShoppingItem = {
  id: string;
  name: string;
  completed: boolean;
  outOfStock: boolean;
  quantity: number;
  unit: string;
  notes: string;
  category: string;
  archived: boolean;
  addedBy: string;
  createdAt: string; // ISO
  familyId: string;
  storeId?: string | null; // חנות שהפריט שייך אליה
};

// DD/MM/YYYY HH:mm
export function formatDateTime(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// פירוק טקסט שהודבק מ-Google Keep לפריטים נפרדים
export function parsePastedList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*[-*•☐☑✔\[\]x✓]+\s*/i, "")
        .replace(/^\s*\d+[.)]\s*/, "")
        .trim(),
    )
    .filter((line) => line.length > 0);
}
