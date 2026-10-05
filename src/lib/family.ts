// ניהול זהות הקבוצה המשפחתית — מזהה קצר שנשמר מקומית ומשותף בקישור הזמנה
const FAMILY_KEY = "smart-shopping-list.family.v1";

export function loadFamilyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FAMILY_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function saveFamilyId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAMILY_KEY, id.trim());
  } catch {
    /* מתעלמים בשקט */
  }
}

// מזהה קריא לבני משפחה: 8 תווים ללא אותיות מבלבלות, מבוסס crypto מאובטח
export function newFamilyCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

// המזהה שמופיע בכתובת ההזמנה (?familyId=XYZ)
export function familyIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("familyId");
  return value && value.trim() ? value.trim().toUpperCase() : null;
}

export function inviteLink(familyId: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/?familyId=${encodeURIComponent(familyId)}`;
}

export function whatsappInvite(familyId: string, userName?: string): string {
  const text = `${userName ? `${userName} מזמין/ה אותך` : "הוזמנת"} להצטרף לרשימת הקניות המשפחתית 🛒\n${inviteLink(familyId)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
