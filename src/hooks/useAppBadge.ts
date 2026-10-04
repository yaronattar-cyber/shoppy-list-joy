import { useEffect, useRef } from "react";
import type { ShoppingItem } from "@/lib/shopping-list";

// חיווי על אייקון האפליקציה: סופר פריטים שבני משפחה אחרים הוסיפו מאז הצפייה האחרונה
const KEY = "badge-last-seen";

export function useAppBadge(items: ShoppingItem[], userName: string | null | undefined) {
  const lastSeen = useRef<number>(0);

  useEffect(() => {
    lastSeen.current = Number(localStorage.getItem(KEY)) || Date.now();
    const seen = () => {
      if (document.visibilityState !== "visible") return;
      lastSeen.current = Date.now();
      localStorage.setItem(KEY, String(lastSeen.current));
      (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    };
    seen();
    document.addEventListener("visibilitychange", seen);
    return () => document.removeEventListener("visibilitychange", seen);
  }, []);

  useEffect(() => {
    if (document.visibilityState === "visible") return;
    const me = userName?.trim();
    const fresh = items.filter((i) => i.addedBy !== me && new Date(i.createdAt).getTime() > lastSeen.current);
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> };
    if (fresh.length) nav.setAppBadge?.(fresh.length).catch(() => {});
    // התראה קטנה כשהאפליקציה ברקע ויש הרשאה
    const last = fresh[0];
    if (last && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("רשימת קניות", { body: `${last.addedBy} הוסיף/ה: ${last.name}`, tag: "family-add" }); } catch { /* לא נתמך */ }
    }
  }, [items, userName]);
}

export function requestBadgePermission() {
  if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
}
