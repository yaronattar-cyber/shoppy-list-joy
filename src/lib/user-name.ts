// שם המשתמש נשמר מקומית — משמש לכותרת האישית ול-metadata של הפריטים
const USER_KEY = "smart-shopping-list.user.v1";

export function loadUserName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function saveUserName(name: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, name.trim());
  } catch {
    // מתעלמים בשקט
  }
}
