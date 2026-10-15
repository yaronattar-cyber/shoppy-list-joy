import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { newFamilyCode } from "@/lib/family";
import { toast } from "sonner";

// רשימת אירוע = "משפחה" מסוג event עם קוד משלה, משותפת לכמה משפחות דרך event_members
export type EventList = { id: string; name: string; owner_family_id: string | null };

const cacheKey = (f: string) => `events-cache-${f}`;
const activeKey = (f: string) => `events-active-${f}`;

export function eventIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("eventId");
  return v && v.trim() ? v.trim().toUpperCase() : null;
}

export function eventInviteLink(id: string) {
  return `${window.location.origin}/?eventId=${encodeURIComponent(id)}`;
}

export function eventWhatsapp(ev: EventList, userName?: string) {
  const text = `${userName ? `${userName} מזמין/ה אתכם` : "הוזמנתם"} לרשימת הקניות המשותפת לאירוע "${ev.name}" 🎉\n${eventInviteLink(ev.id)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function useEvents(familyId: string | null) {
  const [events, setEvents] = useState<EventList[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);

  const pull = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase.from("event_members").select("event_id, families!event_members_event_id_fkey(id,name,owner_family_id)").eq("family_id", familyId);
    if (!data) return;
    const list = data.map((r) => r.families as unknown as EventList).filter(Boolean);
    setEvents(list);
    localStorage.setItem(cacheKey(familyId), JSON.stringify(list));
    setActiveId((a) => (a && !list.some((e) => e.id === a) ? null : a));
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    try { setEvents(JSON.parse(localStorage.getItem(cacheKey(familyId)) ?? "[]")); } catch { /* */ }
    setActiveId(sessionStorage.getItem(activeKey(familyId)));
    // הצטרפות מקישור הזמנה לאירוע
    const fromUrl = eventIdFromUrl();
    const boot = async () => {
      if (fromUrl) {
        const { data: name } = await supabase.rpc("join_event", { _event_id: fromUrl, _family_id: familyId });
        if (name) {
          setActiveId(fromUrl);
          sessionStorage.setItem(activeKey(familyId), fromUrl);
          setJoinedName(name);
        }
        const u = new URL(window.location.href);
        u.searchParams.delete("eventId");
        window.history.replaceState(null, "", u.toString());
      }
      await pull();
    };
    void boot();
    const ch = supabase
      .channel(`events-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_members" }, () => void pull())
      .on("postgres_changes", { event: "*", schema: "public", table: "families" }, () => void pull())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [familyId, pull]);

  const select = useCallback((id: string | null) => {
    setActiveId(id);
    if (!familyId) return;
    if (id) sessionStorage.setItem(activeKey(familyId), id);
    else sessionStorage.removeItem(activeKey(familyId));
  }, [familyId]);

  const create = useCallback(async (name: string): Promise<string | null> => {
    if (!familyId || !name.trim()) return null;
    const id = newFamilyCode();
    const ev = { id, name: name.trim(), owner_family_id: familyId };
    const { error } = await supabase.from("families").insert({ ...ev, kind: "event" });
    if (error) { toast.error("יצירת האירוע נכשלה"); return null; }
    const { error: memberError } = await supabase.from("event_members").insert({ event_id: id, family_id: familyId });
    if (memberError) { await supabase.from("families").delete().eq("id", id).eq("kind", "event"); toast.error("יצירת האירוע נכשלה"); return null; }
    setEvents((e) => [...e, ev]);
    select(id);
    void pull();
    return id;
  }, [familyId, select, pull]);

  const rename = useCallback(async (ev: EventList, name: string) => {
    if (!familyId || !name.trim()) return false;
    const { error } = await supabase.rpc("rename_event", { _event_id: ev.id, _name: name.trim() });
    if (error) { toast.error("עדכון שם האירוע נכשל"); return false; }
    setEvents((current) => current.map((event) => event.id === ev.id ? { ...event, name: name.trim() } : event));
    await pull();
    return true;
  }, [familyId, pull]);

  // היוצר סוגר את האירוע לכולם; משפחה מוזמנת רק עוזבת
  const close = useCallback(async (ev: EventList) => {
    if (!familyId) return;
    const { error } = ev.owner_family_id === familyId
      ? await supabase.from("families").delete().eq("id", ev.id).eq("kind", "event")
      : await supabase.from("event_members").delete().eq("event_id", ev.id).eq("family_id", familyId);
    if (error) { toast.error("מחיקת האירוע נכשלה"); return; }
    setEvents((e) => e.filter((x) => x.id !== ev.id));
    select(null);
    await pull();
  }, [familyId, select, pull]);

  const active = events.find((e) => e.id === activeId) ?? null;
  return { events, active, activeId: active?.id ?? null, select, create, rename, close, joinedName, clearJoined: () => setJoinedName(null) };
}
