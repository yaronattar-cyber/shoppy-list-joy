import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// בני משפחה ותפקידים (אבא/אמא/בן/בת), מסונכרן בזמן אמת
export type Member = { name: string; role: string; lastSeen: string; userId: string | null; isAdmin: boolean };
export const ROLES = ["אבא", "אמא", "בן", "בת"] as const;
export const ROLE_EMOJI: Record<string, string> = { אבא: "👨", אמא: "👩", בן: "👦", בת: "👧" };

export function useFamilyMembers(familyId: string | null, userName: string | null | undefined) {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!familyId) return;
    const { data: auth } = await supabase.auth.getSession();
    setCurrentUserId(auth.session?.user.id ?? null);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("family_id", familyId);
    const { data } = await supabase.from("family_members").select("name, role, last_seen, user_id").eq("family_id", familyId).order("name");
    if (data) setMembers(data.map((m) => ({ name: m.name, role: m.role, lastSeen: m.last_seen, userId: m.user_id, isAdmin: (roles ?? []).some((r) => r.user_id === m.user_id) })));
  }, [familyId]);

  useEffect(() => {
    const me = userName?.trim();
    if (!familyId || !me) return;
    const heartbeat = async () => {
      const { error } = await supabase.rpc("register_household_member", { _family: familyId, _name: me });
      if (error) console.warn("member registration", error.message);
      await load();
    };
    void heartbeat();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void heartbeat(); }, 60000);
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN") setTimeout(() => void heartbeat(), 0); });
    const ch = supabase
      .channel(`members-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_members", filter: `family_id=eq.${familyId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `family_id=eq.${familyId}` }, () => void load())
      .subscribe();
    return () => { clearInterval(timer); authListener.subscription.unsubscribe(); void supabase.removeChannel(ch); };
  }, [familyId, userName, load]);

  const manage = useCallback(async (name: string, action: string, value = "") => {
    if (!familyId) return;
    const { error } = await supabase.rpc("manage_household_member", { _family: familyId, _name: name, _action: action, _value: value });
    if (error) { toast.error("הפעולה לא הושלמה", { description: error.message.includes("Last administrator") ? "חייב להישאר לפחות מנהל משפחה אחד" : "בדקו הרשאות או חיבור ונסו שוב" }); return; }
    await load();
  }, [familyId, load]);
  return { members, currentUserId, isAdmin: members.some((m) => m.userId === currentUserId && m.isAdmin), setRole: (name: string, role: string) => manage(name, "role", role), setAdmin: (name: string, value: boolean) => manage(name, "admin", String(value)), remove: (name: string) => manage(name, "remove") };
}

// מיפוי שם → תפקיד לשימוש בשורות הרשימה
export const MembersContext = createContext<Record<string, string>>({});
export const useMemberRole = (name: string) => useContext(MembersContext)[name] ?? "";
