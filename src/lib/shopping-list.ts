// שכבת נתונים לרשימת הקניות — טיפוסים ועזרי תצוגה משותפים.
// הנתונים עצמם נשמרים ב-Cloud כדי לאפשר סנכרון בין מכשירי המשפחה.

export type ShoppingItem = {
  id: string;
  name: string;
  completed: boolean;
  outOfStock: boolean;
  isImportant?: boolean;
  isUrgent?: boolean;
  quantity: number;
  unit: string;
  notes: string;
  category: string;
  archived: boolean;
  addedBy: string;
  addedByUserId?: string | null;
  modifiedBy?: string;
  modifiedByUserId?: string | null;
  modifiedAt?: string | null;
  createdAt: string; // ISO
  familyId: string;
  storeId?: string | null; // חנות שהפריט שייך אליה
  expiryDate?: string | null; // YYYY-MM-DD
  stockStatus?: "full" | "half" | "low" | undefined;
  assignedTo?: string; // שיוך אופציונלי: מי אחראי על קניית הפריט
  photoUrl?: string | null; // נתיב תמונת מנה באחסון
  lastPrice?: number | null;
  lastPriceCurrency?: string | null;
};

// דחופים וחשובים בראש; בתוך כל קבוצה החדשים ביותר קודמים.
export function importantFirst(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => Number(!!b.isUrgent) - Number(!!a.isUrgent) || Number(!!b.isImportant) - Number(!!a.isImportant) || b.createdAt.localeCompare(a.createdAt));
}

export function crossStoreDuplicates(items: ShoppingItem[], source: ShoppingItem): ShoppingItem[] {
  if (!source.storeId || source.archived) return [];
  return items.filter((item) => item.familyId === source.familyId && !item.archived && !!item.storeId && item.storeId !== source.storeId && item.name.trim().toLocaleLowerCase() === source.name.trim().toLocaleLowerCase());
}

export function missingEventItems(items: ShoppingItem[], inventory: ShoppingItem[], active: ShoppingItem[]): ShoppingItem[] {
  const available = new Map<string, number>();
  const key = (item: ShoppingItem) => `${item.name.trim().toLocaleLowerCase()}\u0000${item.unit.trim()}`;
  for (const item of [...inventory, ...active.filter((item) => !item.completed)]) available.set(key(item), (available.get(key(item)) ?? 0) + item.quantity);
  return items.filter((item) => !item.completed && !item.archived).flatMap((item) => {
    const stock = available.get(key(item)) ?? 0;
    available.set(key(item), Math.max(0, stock - item.quantity));
    return stock >= item.quantity ? [] : [{ ...item, quantity: item.quantity - stock }];
  });
}

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
